import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { Request } from "express";
import { db } from "../db";
import {
  examAttempts,
  examQuestionLinks,
  examQuestionSnapshots,
  exams,
  examSections,
  examTargetClasses,
  questionBankItems,
} from "../db/schema";
import { AssessmentType, CbtSessionType, ExamStatus } from "../db/schema/enums";
import { AuthenticatedUser } from "../types/express";
import { hashValue } from "../utils/bcrypt";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "../utils/app-error";
import { auditService } from "./audit.service";
import { scopeService } from "./scope.service";
import {
  ApproveExamInput,
  CreateExamInput,
  ReleaseExamResultsInput,
  UpdateExamInput,
} from "../validators/exam.validator";

/**
 * Determines whether an exam requires Examiner or School Admin approval before
 * going live/scheduled (Hybrid Approval Policy).
 */
export const requiresApprovalGate = (
  assessmentType: AssessmentType,
  sessionType: CbtSessionType
): boolean => {
  return (
    assessmentType === "Exam" ||
    sessionType === "term_exam" ||
    sessionType === "national_jamb_mock"
  );
};

export const examService = {
  async list(
    actor: AuthenticatedUser,
    filters: { status?: ExamStatus; termId?: string }
  ) {
    const conditions = [isNull(exams.deletedAt)];
    if (filters.status) conditions.push(eq(exams.status, filters.status));
    if (filters.termId) conditions.push(eq(exams.termId, filters.termId));

    if (actor.role === "student") {
      const { classIds } = await scopeService.getStudentActiveClassIds(actor.id);
      if (classIds.length === 0) return [];

      const targeted = await db
        .select({ examId: examTargetClasses.examId })
        .from(examTargetClasses)
        .where(inArray(examTargetClasses.classId, classIds));

      const examIds = [...new Set(targeted.map((t) => t.examId))];
      if (examIds.length === 0) return [];

      conditions.push(inArray(exams.id, examIds));
      conditions.push(inArray(exams.status, ["scheduled", "live", "completed", "published"]));
    } else if (actor.role !== "super_admin" && actor.primaryBranchId) {
      // Branch staff see branch exams + cross-branch shared exams (branchId IS NULL)
      conditions.push(
        or(eq(exams.branchId, actor.primaryBranchId), isNull(exams.branchId))!
      );
    }

    const rows = await db
      .select({
        id: exams.id,
        title: exams.title,
        branchId: exams.branchId,
        schoolId: exams.schoolId,
        schoolLevel: exams.schoolLevel,
        sessionId: exams.sessionId,
        termId: exams.termId,
        sessionType: exams.sessionType,
        assessmentType: exams.assessmentType,
        status: exams.status,
        durationMinutes: exams.durationMinutes,
        passingScore: exams.passingScore,
        scheduledAt: exams.scheduledAt,
        endsAt: exams.endsAt,
        hasAccessPin: exams.accessPinHash,
        allowCalculator: exams.allowCalculator,
        strictProctoring: exams.strictProctoring,
        maxInfractions: exams.maxInfractions,
        enableLiveMonitoring: exams.enableLiveMonitoring,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .where(and(...conditions))
      .orderBy(desc(exams.createdAt))
      .limit(100);

    // Never expose accessPinHash to clients — convert to boolean indicator
    return rows.map(({ hasAccessPin, ...rest }) => ({
      ...rest,
      requiresAccessPin: Boolean(hasAccessPin),
    }));
  },

  async getById(actor: AuthenticatedUser, examId: string) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (actor.role === "student") {
      const { classIds } = await scopeService.getStudentActiveClassIds(actor.id);
      const targets = await db
        .select({ classId: examTargetClasses.classId })
        .from(examTargetClasses)
        .where(eq(examTargetClasses.examId, examId));

      const isEnrolled = targets.some((t) => classIds.includes(t.classId));
      if (!isEnrolled || exam.status === "draft" || exam.status === "pending_approval") {
        throw new ForbiddenException("You do not have access to this exam.");
      }
    } else if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId,
      });
    }

    const sections = await db
      .select()
      .from(examSections)
      .where(eq(examSections.examId, examId))
      .orderBy(examSections.orderIndex);

    const targets = await db
      .select({ classId: examTargetClasses.classId })
      .from(examTargetClasses)
      .where(eq(examTargetClasses.examId, examId));

    const { accessPinHash, ...safeExam } = exam;
    return {
      ...safeExam,
      requiresAccessPin: Boolean(accessPinHash),
      targetClassIds: targets.map((t) => t.classId),
      sections,
    };
  },

  async create(actor: AuthenticatedUser, input: CreateExamInput, req?: Request) {
    const isCrossBranch = input.branchId === null;
    if (isCrossBranch && actor.role !== "super_admin" && actor.role !== "examiner") {
      throw new ForbiddenException(
        "Only Super Admins and Examiners can create cross-branch shared exams."
      );
    }

    const branchId = isCrossBranch ? null : input.branchId ?? actor.primaryBranchId ?? null;
    const schoolId = isCrossBranch ? null : input.schoolId ?? actor.primarySchoolId ?? null;

    if (actor.role === "teacher") {
      for (const classId of input.targetClassIds) {
        for (const section of input.sections) {
          await scopeService.assertTeacherClassSubjectAccess(actor, classId, section.subjectId);
        }
      }
    } else if (branchId) {
      scopeService.assertBranchSchoolScope(actor, { branchId, schoolId });
    }

    const accessPinHash = input.accessPin ? await hashValue(input.accessPin) : null;

    const created = await db.transaction(async (tx) => {
      const [newExam] = await tx
        .insert(exams)
        .values({
          title: input.title,
          branchId,
          schoolId,
          schoolLevel: input.schoolLevel,
          sessionId: input.sessionId,
          termId: input.termId,
          createdBy: actor.id,
          sessionType: input.sessionType,
          assessmentType: input.assessmentType,
          status: "draft",
          instructions: input.instructions,
          durationMinutes: input.durationMinutes,
          passingScore: input.passingScore.toFixed(2),
          scheduledAt: input.scheduledAt,
          endsAt: input.endsAt,
          accessPinHash,
          allowCalculator: input.allowCalculator,
          shuffleQuestions: input.shuffleQuestions,
          shuffleOptions: input.shuffleOptions,
          allowBackwardNavigation: input.allowBackwardNavigation,
          strictProctoring: input.strictProctoring,
          maxInfractions: input.maxInfractions,
          maxTabSwitches: input.maxTabSwitches,
          autoPublishResults: input.autoPublishResults,
          showStudentFeedback: input.showStudentFeedback,
          showCorrectAnswers: input.showCorrectAnswers,
          enableLiveMonitoring: input.enableLiveMonitoring,
        })
        .returning();

      await tx.insert(examTargetClasses).values(
        input.targetClassIds.map((classId) => ({
          examId: newExam.id,
          classId,
        }))
      );

      for (let sIdx = 0; sIdx < input.sections.length; sIdx += 1) {
        const sec = input.sections[sIdx];
        const bankQuestions = await tx
          .select()
          .from(questionBankItems)
          .where(
            and(
              inArray(questionBankItems.id, sec.questionBankItemIds),
              isNull(questionBankItems.deletedAt)
            )
          );

        if (bankQuestions.length !== sec.questionBankItemIds.length) {
          throw new BadRequestException(
            `One or more question bank items in section "${sec.title}" do not exist.`
          );
        }

        const sectionMaxScore = bankQuestions.reduce(
          (sum, q) => sum + Number(q.points),
          0
        );

        const [createdSection] = await tx
          .insert(examSections)
          .values({
            examId: newExam.id,
            subjectId: sec.subjectId,
            title: sec.title,
            orderIndex: sIdx,
            totalQuestions: bankQuestions.length,
            maxScore: sectionMaxScore.toFixed(2),
          })
          .returning();

        await tx.insert(examQuestionLinks).values(
          sec.questionBankItemIds.map((qId, qIdx) => ({
            examId: newExam.id,
            sectionId: createdSection.id,
            questionBankItemId: qId,
            orderIndex: qIdx + 1,
          }))
        );
      }

      return newExam;
    });

    await auditService.log({
      action: "exam.create",
      entityType: "exam",
      entityId: created.id,
      branchId,
      schoolId,
      metadata: {
        title: created.title,
        assessmentType: created.assessmentType,
        sessionType: created.sessionType,
      },
      req,
    });

    const { accessPinHash: _pin, ...safe } = created;
    return { ...safe, requiresAccessPin: Boolean(_pin) };
  },

  /**
   * Freezes linked question_bank_items into immutable exam_question_snapshots.
   */
  async freezeSnapshots(examId: string) {
    const existingSnapshots = await db
      .select({ id: examQuestionSnapshots.id })
      .from(examQuestionSnapshots)
      .where(eq(examQuestionSnapshots.examId, examId))
      .limit(1);

    if (existingSnapshots.length > 0) {
      return; // Already frozen
    }

    const sections = await db
      .select()
      .from(examSections)
      .where(eq(examSections.examId, examId))
      .orderBy(examSections.orderIndex);

    const links = await db
      .select()
      .from(examQuestionLinks)
      .where(eq(examQuestionLinks.examId, examId))
      .orderBy(examQuestionLinks.orderIndex);

    if (links.length === 0) {
      throw new BadRequestException("Cannot publish an exam with zero linked questions.");
    }

    const bankIds = links.map((l) => l.questionBankItemId);
    const bankItems = await db
      .select()
      .from(questionBankItems)
      .where(inArray(questionBankItems.id, bankIds));

    const bankMap = new Map(bankItems.map((b) => [b.id, b]));
    const sectionMap = new Map(sections.map((s) => [s.id, s]));

    let globalNumber = 1;
    const snapshots = links.map((link) => {
      const bankItem = bankMap.get(link.questionBankItemId);
      const section = sectionMap.get(link.sectionId);
      if (!bankItem || !section) {
        throw new BadRequestException("Missing linked question or section during snapshot.");
      }
      return {
        examId,
        sectionId: link.sectionId,
        subjectId: section.subjectId,
        sourceQuestionId: bankItem.id,
        questionNumber: globalNumber++,
        type: bankItem.type,
        prompt: bankItem.prompt,
        contextSnippet: bankItem.contextSnippet,
        imageUrl: bankItem.imageUrl,
        imageCaption: bankItem.imageCaption,
        options: bankItem.options,
        correctOptionId: bankItem.correctOptionId,
        shortAnswer: bankItem.shortAnswer,
        acceptedAnswers: bankItem.acceptedAnswers,
        theoryAnswer: bankItem.theoryAnswer,
        rubrics: bankItem.rubrics,
        points: link.pointsOverride ?? bankItem.points,
        explanation: bankItem.explanation,
      };
    });

    await db.insert(examQuestionSnapshots).values(snapshots);
  },

  /**
   * Hybrid Approval Publish Endpoint:
   * - Teachers publishing CA1-CA4 go straight to live/scheduled & freeze snapshots.
   * - Teachers publishing Terminal/Mock Exams transition to `pending_approval`.
   * - Examiners/Admins can publish/approve directly.
   */
  async publishOrSubmitForApproval(
    actor: AuthenticatedUser,
    examId: string,
    desiredStatus: "scheduled" | "live" = "live",
    req?: Request
  ) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId,
      });
    }

    const needsApproval = requiresApprovalGate(exam.assessmentType, exam.sessionType);

    if (actor.role === "teacher" && needsApproval) {
      const [pending] = await db
        .update(exams)
        .set({ status: "pending_approval", updatedAt: new Date() })
        .where(eq(exams.id, examId))
        .returning();

      await auditService.log({
        action: "exam.submit_for_approval",
        entityType: "exam",
        entityId: examId,
        branchId: exam.branchId,
        schoolId: exam.schoolId,
        metadata: { assessmentType: exam.assessmentType, sessionType: exam.sessionType },
        req,
      });

      const { accessPinHash: _p, ...safe } = pending;
      return { ...safe, requiresAccessPin: Boolean(_p) };
    }

    await this.freezeSnapshots(examId);

    const [published] = await db
      .update(exams)
      .set({
        status: desiredStatus,
        approvedBy: actor.id,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exams.id, examId))
      .returning();

    await auditService.log({
      action: "exam.publish",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: { status: desiredStatus, assessmentType: exam.assessmentType },
      req,
    });

    const { accessPinHash: _p, ...safe } = published;
    return { ...safe, requiresAccessPin: Boolean(_p) };
  },

  async approveExam(
    actor: AuthenticatedUser,
    examId: string,
    input: ApproveExamInput,
    req?: Request
  ) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId,
      });
    }

    await this.freezeSnapshots(examId);

    const updatePayload: Partial<typeof exams.$inferInsert> = {
      status: input.status,
      approvedBy: actor.id,
      approvedAt: new Date(),
      updatedAt: new Date(),
    };
    if (input.scheduledAt) updatePayload.scheduledAt = input.scheduledAt;
    if (input.endsAt) updatePayload.endsAt = input.endsAt;
    if (input.accessPin) updatePayload.accessPinHash = await hashValue(input.accessPin);

    const [approved] = await db
      .update(exams)
      .set(updatePayload)
      .where(eq(exams.id, examId))
      .returning();

    await auditService.log({
      action: "exam.approve",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: { status: input.status, pinRotated: Boolean(input.accessPin) },
      req,
    });

    const { accessPinHash: _p, ...safe } = approved;
    return { ...safe, requiresAccessPin: Boolean(_p) };
  },

  async update(
    actor: AuthenticatedUser,
    examId: string,
    input: UpdateExamInput,
    req?: Request
  ) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId,
      });
    }

    if (actor.role === "teacher" && exam.createdBy !== actor.id) {
      throw new ForbiddenException("Teachers can only modify exams they created.");
    }

    const isEditableDraft =
      exam.status === "draft" || exam.status === "pending_approval";
    const isClosingLiveExam =
      input.status === "completed" &&
      (exam.status === "live" || exam.status === "scheduled");

    if (!isEditableDraft && !isClosingLiveExam) {
      throw new BadRequestException(
        "Only draft or pending_approval exams can be edited. Live/scheduled exams can only be closed (status: 'completed')."
      );
    }

    if (
      isClosingLiveExam &&
      actor.role === "teacher" &&
      requiresApprovalGate(exam.assessmentType, exam.sessionType)
    ) {
      throw new ForbiddenException(
        "Only Examiners or School Admins can close Terminal or National Mock exams."
      );
    }

    const updatePayload: Partial<typeof exams.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (isClosingLiveExam && !isEditableDraft) {
      updatePayload.status = "completed";
      updatePayload.endsAt = new Date();
    } else {
      if (input.title !== undefined) updatePayload.title = input.title;
      if (input.instructions !== undefined) updatePayload.instructions = input.instructions;
      if (input.durationMinutes !== undefined) updatePayload.durationMinutes = input.durationMinutes;
      if (input.passingScore !== undefined) updatePayload.passingScore = input.passingScore.toFixed(2);
      if (input.scheduledAt !== undefined) updatePayload.scheduledAt = input.scheduledAt;
      if (input.endsAt !== undefined) updatePayload.endsAt = input.endsAt;
      if (input.accessPin !== undefined) {
        updatePayload.accessPinHash = input.accessPin ? await hashValue(input.accessPin) : null;
      }
      if (input.status !== undefined) updatePayload.status = input.status;
      if (input.allowCalculator !== undefined) updatePayload.allowCalculator = input.allowCalculator;
      if (input.shuffleQuestions !== undefined) updatePayload.shuffleQuestions = input.shuffleQuestions;
      if (input.shuffleOptions !== undefined) updatePayload.shuffleOptions = input.shuffleOptions;
      if (input.allowBackwardNavigation !== undefined) {
        updatePayload.allowBackwardNavigation = input.allowBackwardNavigation;
      }
      if (input.strictProctoring !== undefined) updatePayload.strictProctoring = input.strictProctoring;
      if (input.maxInfractions !== undefined) updatePayload.maxInfractions = input.maxInfractions;
      if (input.maxTabSwitches !== undefined) updatePayload.maxTabSwitches = input.maxTabSwitches;
      if (input.autoPublishResults !== undefined) updatePayload.autoPublishResults = input.autoPublishResults;
      if (input.showStudentFeedback !== undefined) updatePayload.showStudentFeedback = input.showStudentFeedback;
      if (input.showCorrectAnswers !== undefined) updatePayload.showCorrectAnswers = input.showCorrectAnswers;
      if (input.enableLiveMonitoring !== undefined) {
        updatePayload.enableLiveMonitoring = input.enableLiveMonitoring;
      }
    }

    const [updated] = await db
      .update(exams)
      .set(updatePayload)
      .where(eq(exams.id, examId))
      .returning();

    await auditService.log({
      action: isClosingLiveExam ? "exam.close" : "exam.update",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: { status: updated.status, fields: Object.keys(input) },
      req,
    });

    const { accessPinHash: _p, ...safe } = updated;
    return { ...safe, requiresAccessPin: Boolean(_p) };
  },

  async softDelete(actor: AuthenticatedUser, examId: string, req?: Request) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId,
      });
    }

    if (actor.role === "teacher" && exam.createdBy !== actor.id) {
      throw new ForbiddenException("Teachers can only delete draft exams they created.");
    }

    if (exam.status !== "draft" && exam.status !== "pending_approval") {
      throw new BadRequestException(
        "Cannot delete an exam that is already scheduled, live, completed, or published."
      );
    }

    await db
      .update(exams)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(exams.id, examId));

    await auditService.log({
      action: "exam.delete",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: { title: exam.title },
      req,
    });

    return { deleted: true, id: examId };
  },

  async releaseResults(
    actor: AuthenticatedUser,
    examId: string,
    input: ReleaseExamResultsInput,
    req?: Request
  ) {
    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId,
      });
    }

    const allowedStatuses: Array<"submitted" | "auto_submitted" | "graded" | "flagged"> =
      input.includeFlagged
        ? ["submitted", "auto_submitted", "graded", "flagged"]
        : ["submitted", "auto_submitted", "graded"];

    const conditions = [
      eq(examAttempts.examId, examId),
      inArray(examAttempts.status, allowedStatuses),
      isNull(examAttempts.deletedAt),
    ];

    if (input.attemptIds && input.attemptIds.length > 0) {
      conditions.push(inArray(examAttempts.id, input.attemptIds));
    }

    const released = await db
      .update(examAttempts)
      .set({ resultsReleased: true, updatedAt: new Date() })
      .where(and(...conditions))
      .returning({ id: examAttempts.id });

    if (input.markExamPublished && exam.status !== "published") {
      await db
        .update(exams)
        .set({ status: "published", updatedAt: new Date() })
        .where(eq(exams.id, examId));
    }

    await auditService.log({
      action: "exam.release_results",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: {
        releasedCount: released.length,
        includeFlagged: input.includeFlagged,
        markExamPublished: input.markExamPublished,
      },
      req,
    });

    return {
      examId,
      releasedCount: released.length,
      examStatus: input.markExamPublished ? "published" : exam.status,
    };
  },
};
