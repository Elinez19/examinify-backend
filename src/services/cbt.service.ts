import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { Request } from "express";
import { db } from "../db";
import {
  attemptAnswers,
  attemptSubjectScores,
  examAttempts,
  examQuestionSnapshots,
  exams,
  examSections,
  examTargetClasses,
  proctoringEvents,
  studentProfiles,
  user,
} from "../db/schema";
import { AttemptStatus } from "../db/schema/enums";
import { cacheStore } from "../config/redis.config";
import { AuthenticatedUser, RequestAuthContext } from "../types/express";
import { compareValue } from "../utils/bcrypt";
import {
  BadRequestException,
  ExamClosedException,
  ForbiddenException,
  NotFoundException,
  SessionLockedException,
} from "../utils/app-error";
import {
  autoGradeObjectiveAnswer,
  computeWaecGrade,
} from "../utils/grading.util";
import {
  sanitizeQuestionForActiveAttempt,
  shuffleArray,
} from "../utils/cbt-sanitizer.util";
import { auditService } from "./audit.service";
import { scopeService } from "./scope.service";
import { realtimeGateway } from "../realtime/ws.server";
import {
  RecordInfractionInput,
  SaveAnswerInput,
  StartAttemptInput,
} from "../validators/cbt.validator";

const SUBMISSION_GRACE_MS = 10_000; // 10s network grace window
const attemptLockKey = (attemptId: string) => `examinify:attempt_lock:${attemptId}`;

export const cbtService = {
  async startOrResumeAttempt(
    authCtx: RequestAuthContext,
    examId: string,
    input: StartAttemptInput,
    req?: Request
  ) {
    const actor = authCtx.user;
    const sessionId = authCtx.session.id;

    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, examId), isNull(exams.deletedAt)))
      .limit(1);

    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    if (exam.status !== "live") {
      throw new ExamClosedException("This exam is not currently live.");
    }

    const now = new Date();
    if (exam.scheduledAt && now < exam.scheduledAt) {
      throw new ExamClosedException("This exam has not started yet.");
    }
    if (exam.endsAt && now > exam.endsAt) {
      throw new ExamClosedException("The scheduled window for this exam has closed.");
    }

    const { studentProfileId, classIds } = await scopeService.getStudentActiveClassIds(actor.id);
    const targets = await db
      .select({ classId: examTargetClasses.classId })
      .from(examTargetClasses)
      .where(eq(examTargetClasses.examId, examId));

    if (!targets.some((t) => classIds.includes(t.classId))) {
      throw new ForbiddenException("Your class is not enrolled for this exam.");
    }

    // Verify Access PIN if configured on the exam
    if (exam.accessPinHash) {
      if (!input.accessPin) {
        throw new ForbiddenException("An Exam Access PIN is required to start this exam.");
      }
      const pinValid = await compareValue(input.accessPin, exam.accessPinHash);
      if (!pinValid) {
        throw new ForbiddenException("Invalid Exam Access PIN.");
      }
    }

    const snapshots = await db
      .select()
      .from(examQuestionSnapshots)
      .where(eq(examQuestionSnapshots.examId, examId))
      .orderBy(examQuestionSnapshots.questionNumber);

    if (snapshots.length === 0) {
      throw new BadRequestException("Exam has no published question snapshots.");
    }

    const sections = await db
      .select()
      .from(examSections)
      .where(eq(examSections.examId, examId))
      .orderBy(examSections.orderIndex);

    // Check for existing attempt
    let [attempt] = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.examId, examId),
          eq(examAttempts.studentProfileId, studentProfileId)
        )
      )
      .limit(1);

    if (attempt) {
      if (attempt.status !== "in_progress") {
        throw new ExamClosedException("You have already completed this exam.");
      }

      if (now.getTime() > attempt.serverExpiresAt.getTime() + SUBMISSION_GRACE_MS) {
        await this.finalizeAttempt(attempt.id, "auto_submitted");
        throw new ExamClosedException("Your exam timer has expired and your attempt was auto-submitted.");
      }

      // Single-active-session enforcement during live exam
      const cachedLock = await cacheStore.get(attemptLockKey(attempt.id));
      const activeLock = cachedLock ?? attempt.lockedSessionId;
      if (activeLock && activeLock !== sessionId) {
        await db.insert(proctoringEvents).values({
          attemptId: attempt.id,
          eventType: "session_conflict",
          details: { attemptedSessionId: sessionId },
        });
        throw new SessionLockedException();
      }

      // Re-bind if unlocked by examiner
      if (!attempt.lockedSessionId) {
        [attempt] = await db
          .update(examAttempts)
          .set({ lockedSessionId: sessionId, updatedAt: new Date() })
          .where(eq(examAttempts.id, attempt.id))
          .returning();
      }
    } else {
      const serverExpiresAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1000);
      const effectiveExpiresAt =
        exam.endsAt && exam.endsAt < serverExpiresAt ? exam.endsAt : serverExpiresAt;

      const questionOrder = exam.shuffleQuestions
        ? shuffleArray(snapshots.map((s) => s.id))
        : snapshots.map((s) => s.id);

      const optionOrders: Record<string, string[]> = {};
      if (exam.shuffleOptions) {
        for (const snap of snapshots) {
          if (snap.options && snap.options.length > 0) {
            optionOrders[snap.id] = shuffleArray(snap.options.map((o) => o.id));
          }
        }
      }

      [attempt] = await db
        .insert(examAttempts)
        .values({
          examId,
          studentProfileId,
          userId: actor.id,
          lockedSessionId: sessionId,
          status: "in_progress",
          questionOrder,
          optionOrders,
          startedAt: now,
          serverExpiresAt: effectiveExpiresAt,
          ipAddress: req?.ip ?? null,
          userAgent: req?.get("user-agent") ?? null,
        })
        .returning();

      realtimeGateway.broadcastToExamMonitors(examId, {
        type: "student:joined",
        attemptId: attempt.id,
        userId: actor.id,
        studentName: actor.name,
      });
    }

    const ttlSeconds = Math.max(
      60,
      Math.ceil((attempt.serverExpiresAt.getTime() - now.getTime()) / 1000) + 120
    );
    await cacheStore.set(attemptLockKey(attempt.id), sessionId, ttlSeconds);

    const savedAnswers = await db
      .select({
        snapshotQuestionId: attemptAnswers.snapshotQuestionId,
        selectedOptionId: attemptAnswers.selectedOptionId,
        textResponse: attemptAnswers.textResponse,
        isFlagged: attemptAnswers.isFlagged,
        isVisited: attemptAnswers.isVisited,
      })
      .from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, attempt.id));

    const snapMap = new Map(snapshots.map((s) => [s.id, s]));
    const orderedSanitizedQuestions = (
      attempt.questionOrder.length > 0 ? attempt.questionOrder : snapshots.map((s) => s.id)
    )
      .map((id) => snapMap.get(id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((snap) => sanitizeQuestionForActiveAttempt(snap, attempt.optionOrders[snap.id]));

    return {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        serverExpiresAt: attempt.serverExpiresAt,
        serverTime: now,
        remainingSeconds: Math.max(
          0,
          Math.floor((attempt.serverExpiresAt.getTime() - now.getTime()) / 1000)
        ),
        infractionCount: attempt.infractionCount,
        maxInfractions: exam.maxInfractions,
      },
      examConfig: {
        title: exam.title,
        sessionType: exam.sessionType,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        allowCalculator: exam.allowCalculator,
        allowBackwardNavigation: exam.allowBackwardNavigation,
        strictProctoring: exam.strictProctoring,
        maxTabSwitches: exam.maxTabSwitches,
      },
      sections,
      questions: orderedSanitizedQuestions,
      savedAnswers,
    };
  },

  async saveAnswer(
    authCtx: RequestAuthContext,
    attemptId: string,
    input: SaveAnswerInput
  ) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, authCtx.user.id)))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }

    if (attempt.status !== "in_progress") {
      throw new ExamClosedException("Cannot modify answers after submission.");
    }

    const cachedLock = await cacheStore.get(attemptLockKey(attempt.id));
    const activeLock = cachedLock ?? attempt.lockedSessionId;
    if (activeLock && activeLock !== authCtx.session.id) {
      throw new SessionLockedException();
    }

    const now = Date.now();
    if (now > attempt.serverExpiresAt.getTime() + SUBMISSION_GRACE_MS) {
      await this.finalizeAttempt(attempt.id, "auto_submitted");
      throw new ExamClosedException("Exam timer expired. Your attempt has been auto-submitted.");
    }

    const [snapshot] = await db
      .select({ id: examQuestionSnapshots.id })
      .from(examQuestionSnapshots)
      .where(
        and(
          eq(examQuestionSnapshots.id, input.snapshotQuestionId),
          eq(examQuestionSnapshots.examId, attempt.examId)
        )
      )
      .limit(1);

    if (!snapshot) {
      throw new BadRequestException("Question does not belong to this exam.");
    }

    const [saved] = await db
      .insert(attemptAnswers)
      .values({
        attemptId: attempt.id,
        snapshotQuestionId: input.snapshotQuestionId,
        selectedOptionId: input.selectedOptionId ?? null,
        textResponse: input.textResponse ?? null,
        isFlagged: input.isFlagged ?? false,
        isVisited: input.isVisited ?? true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [attemptAnswers.attemptId, attemptAnswers.snapshotQuestionId],
        set: {
          selectedOptionId: input.selectedOptionId ?? null,
          textResponse: input.textResponse ?? null,
          isFlagged: input.isFlagged ?? false,
          isVisited: input.isVisited ?? true,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: attemptAnswers.id,
        snapshotQuestionId: attemptAnswers.snapshotQuestionId,
        selectedOptionId: attemptAnswers.selectedOptionId,
        textResponse: attemptAnswers.textResponse,
        isFlagged: attemptAnswers.isFlagged,
        isVisited: attemptAnswers.isVisited,
        updatedAt: attemptAnswers.updatedAt,
      });

    return saved;
  },

  async recordInfraction(
    authCtx: RequestAuthContext,
    attemptId: string,
    input: RecordInfractionInput
  ) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, authCtx.user.id)))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }

    if (attempt.status !== "in_progress") {
      return { status: attempt.status, infractionCount: attempt.infractionCount, autoSubmitted: false };
    }

    const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }

    await db.insert(proctoringEvents).values({
      attemptId: attempt.id,
      eventType: input.eventType,
      details: input.details,
    });

    const [updated] = await db
      .update(examAttempts)
      .set({
        infractionCount: sql`${examAttempts.infractionCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(examAttempts.id, attempt.id))
      .returning();

    realtimeGateway.broadcastToExamMonitors(exam.id, {
      type: "proctor:infraction",
      attemptId: attempt.id,
      userId: authCtx.user.id,
      studentName: authCtx.user.name,
      eventType: input.eventType,
      infractionCount: updated.infractionCount,
      maxInfractions: exam.maxInfractions,
    });

    if (exam.strictProctoring && updated.infractionCount >= exam.maxInfractions) {
      await this.finalizeAttempt(attempt.id, "flagged");
      return {
        status: "flagged",
        infractionCount: updated.infractionCount,
        maxInfractions: exam.maxInfractions,
        autoSubmitted: true,
      };
    }

    return {
      status: updated.status,
      infractionCount: updated.infractionCount,
      maxInfractions: exam.maxInfractions,
      autoSubmitted: false,
    };
  },

  async submitAttempt(authCtx: RequestAuthContext, attemptId: string) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(and(eq(examAttempts.id, attemptId), eq(examAttempts.userId, authCtx.user.id)))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }

    if (attempt.status !== "in_progress") {
      return this.getStudentResultView(attempt.id);
    }

    const cachedLock = await cacheStore.get(attemptLockKey(attempt.id));
    const activeLock = cachedLock ?? attempt.lockedSessionId;
    if (activeLock && activeLock !== authCtx.session.id) {
      throw new SessionLockedException();
    }

    await this.finalizeAttempt(attempt.id, "submitted");
    return this.getStudentResultView(attempt.id);
  },

  async finalizeAttempt(
    attemptId: string,
    targetStatus: "submitted" | "auto_submitted" | "flagged"
  ) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt || attempt.status !== "in_progress") {
      return attempt;
    }

    const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);
    const snapshots = await db
      .select()
      .from(examQuestionSnapshots)
      .where(eq(examQuestionSnapshots.examId, attempt.examId));
    const answers = await db
      .select()
      .from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, attempt.id));

    const answerMap = new Map(answers.map((a) => [a.snapshotQuestionId, a]));

    let totalAwarded = 0;
    let totalMax = 0;
    let hasTheory = false;

    const subjectBuckets = new Map<
      string,
      { total: number; attempted: number; correct: number; rawScore: number; maxScore: number }
    >();

    for (const snap of snapshots) {
      const points = Number(snap.points);
      totalMax += points;

      const bucket = subjectBuckets.get(snap.subjectId) ?? {
        total: 0,
        attempted: 0,
        correct: 0,
        rawScore: 0,
        maxScore: 0,
      };
      bucket.total += 1;
      bucket.maxScore += points;

      const ans = answerMap.get(snap.id);
      const isAttempted = Boolean(ans && (ans.selectedOptionId || ans.textResponse?.trim()));
      if (isAttempted) bucket.attempted += 1;

      const graded = autoGradeObjectiveAnswer({
        type: snap.type,
        points,
        correctOptionId: snap.correctOptionId,
        shortAnswer: snap.shortAnswer,
        acceptedAnswers: snap.acceptedAnswers,
        selectedOptionId: ans?.selectedOptionId,
        textResponse: ans?.textResponse,
      });

      if (graded.requiresManualGrading) {
        hasTheory = true;
      } else {
        const awarded = graded.awardedPoints ?? 0;
        totalAwarded += awarded;
        bucket.rawScore += awarded;
        if (graded.isCorrect) bucket.correct += 1;

        if (ans) {
          await db
            .update(attemptAnswers)
            .set({
              isCorrect: graded.isCorrect,
              awardedPoints: awarded.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(attemptAnswers.id, ans.id));
        }
      }

      subjectBuckets.set(snap.subjectId, bucket);
    }

    const percentage = totalMax > 0 ? Number(((totalAwarded / totalMax) * 100).toFixed(2)) : 0;
    const waec = computeWaecGrade(percentage);
    const passingScore = exam ? Number(exam.passingScore) : 50;
    const finalStatus =
      targetStatus === "flagged"
        ? "flagged"
        : hasTheory
          ? targetStatus
          : "graded";

    const [updatedAttempt] = await db
      .update(examAttempts)
      .set({
        status: finalStatus,
        submittedAt: new Date(),
        lockedSessionId: null,
        aggregateScore: totalAwarded.toFixed(2),
        maxPossibleScore: totalMax.toFixed(2),
        aggregatePercentage: percentage.toFixed(2),
        gradeLetter: waec.gradeLetter,
        performanceRemark: waec.remarks,
        isPassed: percentage >= passingScore,
        resultsReleased: Boolean(exam?.autoPublishResults && !hasTheory),
        updatedAt: new Date(),
      })
      .where(eq(examAttempts.id, attempt.id))
      .returning();

    for (const [subjectId, bucket] of subjectBuckets.entries()) {
      const subPct =
        bucket.maxScore > 0 ? Number(((bucket.rawScore / bucket.maxScore) * 100).toFixed(2)) : 0;
      const subGrade = computeWaecGrade(subPct);

      await db
        .insert(attemptSubjectScores)
        .values({
          attemptId: attempt.id,
          subjectId,
          totalQuestions: bucket.total,
          attemptedQuestions: bucket.attempted,
          correctAnswers: bucket.correct,
          rawScore: bucket.rawScore.toFixed(2),
          maxScore: bucket.maxScore.toFixed(2),
          percentage: subPct.toFixed(2),
          gradeLetter: subGrade.gradeLetter,
        })
        .onConflictDoUpdate({
          target: [attemptSubjectScores.attemptId, attemptSubjectScores.subjectId],
          set: {
            attemptedQuestions: bucket.attempted,
            correctAnswers: bucket.correct,
            rawScore: bucket.rawScore.toFixed(2),
            percentage: subPct.toFixed(2),
            gradeLetter: subGrade.gradeLetter,
          },
        });
    }

    await cacheStore.del(attemptLockKey(attempt.id));

    realtimeGateway.broadcastToExamMonitors(attempt.examId, {
      type: "student:submitted",
      attemptId: attempt.id,
      userId: attempt.userId,
      status: updatedAttempt.status,
    });

    return updatedAttempt;
  },

  async getStudentResultView(attemptId: string) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Attempt not found.");
    }

    const [exam] = await db.select().from(exams).where(eq(exams.id, attempt.examId)).limit(1);

    if (!attempt.resultsReleased) {
      return {
        attemptId: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        resultsReleased: false,
        message: "Submission recorded. Results will be visible once published by your examiner.",
      };
    }

    const subjectScores = await db
      .select()
      .from(attemptSubjectScores)
      .where(eq(attemptSubjectScores.attemptId, attempt.id));

    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: exam?.title,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      resultsReleased: true,
      aggregateScore: Number(attempt.aggregateScore ?? 0),
      maxPossibleScore: Number(attempt.maxPossibleScore ?? 0),
      aggregatePercentage: Number(attempt.aggregatePercentage ?? 0),
      gradeLetter: attempt.gradeLetter,
      performanceRemark: attempt.performanceRemark,
      isPassed: attempt.isPassed,
      subjects: subjectScores,
    };
  },

  async listMyResults(userId: string) {
    const attempts = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userId),
          inArray(examAttempts.status, ["submitted", "auto_submitted", "flagged", "graded"])
        )
      );

    return Promise.all(attempts.map((a) => this.getStudentResultView(a.id)));
  },

  async listExamAttempts(
    actor: AuthenticatedUser,
    examId: string,
    filters?: { status?: AttemptStatus }
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
      const targets = await db
        .select({ classId: examTargetClasses.classId })
        .from(examTargetClasses)
        .where(eq(examTargetClasses.examId, examId));

      let hasClassAccess = false;
      for (const t of targets) {
        try {
          await scopeService.assertTeacherClassSubjectAccess(actor, t.classId);
          hasClassAccess = true;
          break;
        } catch {
          // continue checking remaining target classes
        }
      }
      if (!hasClassAccess) {
        throw new ForbiddenException("Access denied: you are not assigned to monitor this exam.");
      }
    }

    const conditions = [
      eq(examAttempts.examId, examId),
      isNull(examAttempts.deletedAt),
    ];
    if (filters?.status) {
      conditions.push(eq(examAttempts.status, filters.status));
    }

    const rows = await db
      .select({
        attempt: examAttempts,
        studentName: user.name,
        username: user.username,
        studentEmail: user.email,
        registrationNumber: studentProfiles.registrationNumber,
      })
      .from(examAttempts)
      .innerJoin(studentProfiles, eq(examAttempts.studentProfileId, studentProfiles.id))
      .innerJoin(user, eq(examAttempts.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(examAttempts.startedAt))
      .limit(500);

    const theorySnapshots = await db
      .select({ id: examQuestionSnapshots.id })
      .from(examQuestionSnapshots)
      .where(
        and(
          eq(examQuestionSnapshots.examId, examId),
          eq(examQuestionSnapshots.type, "theory")
        )
      );
    const theoryIds = theorySnapshots.map((s) => s.id);

    const attemptIds = rows.map((r) => r.attempt.id);
    const gradedTheoryByAttempt = new Map<string, number>();

    if (theoryIds.length > 0 && attemptIds.length > 0) {
      const theoryAnswers = await db
        .select({
          attemptId: attemptAnswers.attemptId,
          awardedPoints: attemptAnswers.awardedPoints,
        })
        .from(attemptAnswers)
        .where(
          and(
            inArray(attemptAnswers.attemptId, attemptIds),
            inArray(attemptAnswers.snapshotQuestionId, theoryIds)
          )
        );

      for (const ans of theoryAnswers) {
        if (ans.awardedPoints !== null) {
          gradedTheoryByAttempt.set(
            ans.attemptId,
            (gradedTheoryByAttempt.get(ans.attemptId) ?? 0) + 1
          );
        }
      }
    }

    return Promise.all(
      rows.map(async ({ attempt, studentName, username, studentEmail, registrationNumber }) => {
        const cachedLock =
          attempt.status === "in_progress"
            ? await cacheStore.get(attemptLockKey(attempt.id))
            : null;
        const isLocked = Boolean(cachedLock ?? attempt.lockedSessionId);
        const gradedTheory = gradedTheoryByAttempt.get(attempt.id) ?? 0;
        const pendingTheoryCount = Math.max(0, theoryIds.length - gradedTheory);

        return {
          attemptId: attempt.id,
          examId: attempt.examId,
          studentProfileId: attempt.studentProfileId,
          userId: attempt.userId,
          studentName,
          username,
          studentEmail,
          registrationNumber,
          status: attempt.status,
          isLocked,
          startedAt: attempt.startedAt,
          serverExpiresAt: attempt.serverExpiresAt,
          submittedAt: attempt.submittedAt,
          infractionCount: attempt.infractionCount,
          aggregateScore: attempt.aggregateScore !== null ? Number(attempt.aggregateScore) : null,
          maxPossibleScore:
            attempt.maxPossibleScore !== null ? Number(attempt.maxPossibleScore) : null,
          aggregatePercentage:
            attempt.aggregatePercentage !== null ? Number(attempt.aggregatePercentage) : null,
          gradeLetter: attempt.gradeLetter,
          performanceRemark: attempt.performanceRemark,
          isPassed: attempt.isPassed,
          resultsReleased: attempt.resultsReleased,
          pendingTheoryCount,
        };
      })
    );
  },

  async getAttemptDetailForStaff(actor: AuthenticatedUser, attemptId: string) {
    const [row] = await db
      .select({
        attempt: examAttempts,
        studentName: user.name,
        username: user.username,
        studentEmail: user.email,
        registrationNumber: studentProfiles.registrationNumber,
      })
      .from(examAttempts)
      .innerJoin(studentProfiles, eq(examAttempts.studentProfileId, studentProfiles.id))
      .innerJoin(user, eq(examAttempts.userId, user.id))
      .where(and(eq(examAttempts.id, attemptId), isNull(examAttempts.deletedAt)))
      .limit(1);

    if (!row) {
      throw new NotFoundException("Exam attempt not found.");
    }

    const [exam] = await db
      .select()
      .from(exams)
      .where(and(eq(exams.id, row.attempt.examId), isNull(exams.deletedAt)))
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
      const targets = await db
        .select({ classId: examTargetClasses.classId })
        .from(examTargetClasses)
        .where(eq(examTargetClasses.examId, exam.id));

      let hasClassAccess = false;
      for (const t of targets) {
        try {
          await scopeService.assertTeacherClassSubjectAccess(actor, t.classId);
          hasClassAccess = true;
          break;
        } catch {
          // check next class
        }
      }
      if (!hasClassAccess) {
        throw new ForbiddenException("Access denied: you are not assigned to review this attempt.");
      }
    }

    const [snapshots, answers, events, subjectScores] = await Promise.all([
      db
        .select()
        .from(examQuestionSnapshots)
        .where(eq(examQuestionSnapshots.examId, exam.id))
        .orderBy(examQuestionSnapshots.questionNumber),
      db
        .select()
        .from(attemptAnswers)
        .where(eq(attemptAnswers.attemptId, attemptId)),
      db
        .select()
        .from(proctoringEvents)
        .where(eq(proctoringEvents.attemptId, attemptId))
        .orderBy(desc(proctoringEvents.occurredAt)),
      db
        .select()
        .from(attemptSubjectScores)
        .where(eq(attemptSubjectScores.attemptId, attemptId)),
    ]);

    const answerMap = new Map(answers.map((a) => [a.snapshotQuestionId, a]));

    const items = snapshots.map((snap) => {
      const ans = answerMap.get(snap.id);
      return {
        answerId: ans?.id ?? null,
        snapshotQuestionId: snap.id,
        sectionId: snap.sectionId,
        subjectId: snap.subjectId,
        questionNumber: snap.questionNumber,
        type: snap.type,
        prompt: snap.prompt,
        contextSnippet: snap.contextSnippet,
        imageUrl: snap.imageUrl,
        imageCaption: snap.imageCaption,
        options: snap.options,
        correctOptionId: snap.correctOptionId,
        shortAnswer: snap.shortAnswer,
        acceptedAnswers: snap.acceptedAnswers,
        theoryAnswer: snap.theoryAnswer,
        rubrics: snap.rubrics,
        maxPoints: Number(snap.points),
        explanation: snap.explanation,
        studentResponse: ans
          ? {
              selectedOptionId: ans.selectedOptionId,
              textResponse: ans.textResponse,
              isFlagged: ans.isFlagged,
              isVisited: ans.isVisited,
              isCorrect: ans.isCorrect,
              awardedPoints: ans.awardedPoints !== null ? Number(ans.awardedPoints) : null,
              rubricBreakdown: ans.rubricBreakdown,
              graderFeedback: ans.graderFeedback,
              gradedBy: ans.gradedBy,
              gradedAt: ans.gradedAt,
              updatedAt: ans.updatedAt,
            }
          : null,
      };
    });

    const cachedLock =
      row.attempt.status === "in_progress"
        ? await cacheStore.get(attemptLockKey(row.attempt.id))
        : null;

    return {
      attempt: {
        id: row.attempt.id,
        examId: row.attempt.examId,
        examTitle: exam.title,
        studentProfileId: row.attempt.studentProfileId,
        userId: row.attempt.userId,
        studentName: row.studentName,
        username: row.username,
        studentEmail: row.studentEmail,
        registrationNumber: row.registrationNumber,
        status: row.attempt.status,
        isLocked: Boolean(cachedLock ?? row.attempt.lockedSessionId),
        startedAt: row.attempt.startedAt,
        serverExpiresAt: row.attempt.serverExpiresAt,
        submittedAt: row.attempt.submittedAt,
        infractionCount: row.attempt.infractionCount,
        maxInfractions: exam.maxInfractions,
        aggregateScore:
          row.attempt.aggregateScore !== null ? Number(row.attempt.aggregateScore) : null,
        maxPossibleScore:
          row.attempt.maxPossibleScore !== null ? Number(row.attempt.maxPossibleScore) : null,
        aggregatePercentage:
          row.attempt.aggregatePercentage !== null
            ? Number(row.attempt.aggregatePercentage)
            : null,
        gradeLetter: row.attempt.gradeLetter,
        performanceRemark: row.attempt.performanceRemark,
        isPassed: row.attempt.isPassed,
        resultsReleased: row.attempt.resultsReleased,
      },
      items,
      subjectScores,
      proctoringEvents: events,
    };
  },

  async forceSubmitAttempt(
    authCtx: RequestAuthContext,
    attemptId: string,
    reason?: string,
    req?: Request
  ) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }

    await db.insert(proctoringEvents).values({
      attemptId: attempt.id,
      eventType: "force_submit",
      details: { actorId: authCtx.user.id, reason: reason ?? "Forced by examiner" },
    });

    const finalized = await this.finalizeAttempt(attempt.id, "flagged");

    realtimeGateway.notifyStudentInExam(attempt.examId, attempt.userId, {
      type: "attempt:force_submitted",
      attemptId: attempt.id,
      reason: reason ?? "Your exam has been concluded by the examiner.",
    });

    await auditService.log({
      action: "attempt.force_submit",
      entityType: "exam_attempt",
      entityId: attempt.id,
      metadata: { examId: attempt.examId, studentUserId: attempt.userId, reason },
      req,
    });

    return finalized;
  },

  async unlockAttemptSession(
    authCtx: RequestAuthContext,
    attemptId: string,
    req?: Request
  ) {
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }

    await db
      .update(examAttempts)
      .set({ lockedSessionId: null, updatedAt: new Date() })
      .where(eq(examAttempts.id, attempt.id));

    await cacheStore.del(attemptLockKey(attempt.id));

    await auditService.log({
      action: "attempt.unlock_session",
      entityType: "exam_attempt",
      entityId: attempt.id,
      metadata: { examId: attempt.examId, unlockedBy: authCtx.user.id },
      req,
    });

    return { unlocked: true, attemptId: attempt.id };
  },

  async sweepExpiredAttempts(): Promise<number> {
    const cutoff = new Date(Date.now() - SUBMISSION_GRACE_MS);
    const expired = await db
      .select({ id: examAttempts.id })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.status, "in_progress"),
          lte(examAttempts.serverExpiresAt, cutoff)
        )
      )
      .limit(50);

    for (const row of expired) {
      await this.finalizeAttempt(row.id, "auto_submitted");
    }

    return expired.length;
  },
};
