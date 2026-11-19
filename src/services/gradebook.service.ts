import { and, desc, eq } from "drizzle-orm";
import { Request } from "express";
import Papa from "papaparse";
import { db } from "../db";
import {
  attemptAnswers,
  examAttempts,
  examQuestionSnapshots,
  gradebookRecords,
  studentProfiles,
  user,
} from "../db/schema";
import { AuthenticatedUser } from "../types/express";
import {
  computeGradebookTotals,
  computeRubricWeightedPoints,
  computeWaecGrade,
} from "../utils/grading.util";
import { BadRequestException, NotFoundException } from "../utils/app-error";
import { auditService } from "./audit.service";
import { scopeService } from "./scope.service";
import {
  GradeTheoryAnswerInput,
  UpsertGradebookInput,
} from "../validators/exam.validator";

export const gradebookService = {
  async gradeTheoryAnswer(
    actor: AuthenticatedUser,
    attemptId: string,
    answerId: string,
    input: GradeTheoryAnswerInput,
    req?: Request
  ) {
    const [answer] = await db
      .select()
      .from(attemptAnswers)
      .where(and(eq(attemptAnswers.id, answerId), eq(attemptAnswers.attemptId, attemptId)))
      .limit(1);

    if (!answer) {
      throw new NotFoundException("Attempt answer not found.");
    }

    const [snapshot] = await db
      .select()
      .from(examQuestionSnapshots)
      .where(eq(examQuestionSnapshots.id, answer.snapshotQuestionId))
      .limit(1);

    if (!snapshot || snapshot.type !== "theory") {
      throw new BadRequestException("Only theory answers can be manually graded here.");
    }

    const maxPoints = Number(snapshot.points);
    let awarded = input.awardedPoints;

    if (awarded === undefined && input.rubricBreakdown && snapshot.rubrics) {
      awarded = computeRubricWeightedPoints(
        maxPoints,
        snapshot.rubrics,
        input.rubricBreakdown
      );
    }

    if (awarded === undefined) {
      throw new BadRequestException("Provide either awardedPoints or rubricBreakdown.");
    }

    if (awarded > maxPoints) {
      throw new BadRequestException(`Awarded points cannot exceed max points (${maxPoints}).`);
    }

    const [updatedAnswer] = await db
      .update(attemptAnswers)
      .set({
        awardedPoints: awarded.toFixed(2),
        isCorrect: awarded >= maxPoints * 0.5,
        rubricBreakdown: input.rubricBreakdown ?? null,
        graderFeedback: input.graderFeedback ?? null,
        gradedBy: actor.id,
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(attemptAnswers.id, answerId))
      .returning();

    // Recompute aggregate attempt score
    const allSnapshots = await db
      .select()
      .from(examQuestionSnapshots)
      .where(eq(examQuestionSnapshots.examId, snapshot.examId));
    const allAnswers = await db
      .select()
      .from(attemptAnswers)
      .where(eq(attemptAnswers.attemptId, attemptId));

    const maxPossible = allSnapshots.reduce((sum, s) => sum + Number(s.points), 0);
    const totalAwarded = allAnswers.reduce(
      (sum, a) => sum + (a.awardedPoints ? Number(a.awardedPoints) : 0),
      0
    );
    const percentage = maxPossible > 0 ? Number(((totalAwarded / maxPossible) * 100).toFixed(2)) : 0;
    const waec = computeWaecGrade(percentage);

    const hasPendingTheory = allSnapshots.some((s) => {
      if (s.type !== "theory") return false;
      const ans = allAnswers.find((a) => a.snapshotQuestionId === s.id);
      return !ans || ans.awardedPoints === null;
    });

    await db
      .update(examAttempts)
      .set({
        aggregateScore: totalAwarded.toFixed(2),
        maxPossibleScore: maxPossible.toFixed(2),
        aggregatePercentage: percentage.toFixed(2),
        gradeLetter: waec.gradeLetter,
        performanceRemark: waec.remarks,
        isPassed: waec.isPassed,
        status: hasPendingTheory ? "submitted" : "graded",
        updatedAt: new Date(),
      })
      .where(eq(examAttempts.id, attemptId));

    await auditService.log({
      action: "attempt.grade_theory",
      entityType: "attempt_answer",
      entityId: answerId,
      metadata: { attemptId, awardedPoints: awarded, maxPoints },
      req,
    });

    return updatedAnswer;
  },

  async upsertRecord(
    actor: AuthenticatedUser,
    input: UpsertGradebookInput,
    req?: Request
  ) {
    await scopeService.assertTeacherClassSubjectAccess(actor, input.classId, input.subjectId);

    const computed = computeGradebookTotals({
      ca1Score: input.ca1Score,
      ca2Score: input.ca2Score,
      ca3Score: input.ca3Score,
      ca4Score: input.ca4Score,
      terminalExamScore: input.terminalExamScore,
    });

    const [record] = await db
      .insert(gradebookRecords)
      .values({
        studentProfileId: input.studentProfileId,
        classId: input.classId,
        subjectId: input.subjectId,
        sessionId: input.sessionId,
        termId: input.termId,
        ca1Score: input.ca1Score.toFixed(2),
        ca2Score: input.ca2Score.toFixed(2),
        ca3Score: input.ca3Score.toFixed(2),
        ca4Score: input.ca4Score.toFixed(2),
        totalCaScore: computed.totalCaScore.toFixed(2),
        terminalExamScore: input.terminalExamScore.toFixed(2),
        grandTotal: computed.grandTotal.toFixed(2),
        gradeLetter: computed.gradeLetter,
        remarks: computed.remarks,
        isAtRisk: computed.isAtRisk,
        updatedBy: actor.id,
      })
      .onConflictDoUpdate({
        target: [
          gradebookRecords.studentProfileId,
          gradebookRecords.subjectId,
          gradebookRecords.termId,
        ],
        set: {
          ca1Score: input.ca1Score.toFixed(2),
          ca2Score: input.ca2Score.toFixed(2),
          ca3Score: input.ca3Score.toFixed(2),
          ca4Score: input.ca4Score.toFixed(2),
          totalCaScore: computed.totalCaScore.toFixed(2),
          terminalExamScore: input.terminalExamScore.toFixed(2),
          grandTotal: computed.grandTotal.toFixed(2),
          gradeLetter: computed.gradeLetter,
          remarks: computed.remarks,
          isAtRisk: computed.isAtRisk,
          updatedBy: actor.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    await auditService.log({
      action: input.overrideReason ? "gradebook.override" : "gradebook.upsert",
      entityType: "gradebook_record",
      entityId: record.id,
      metadata: {
        studentProfileId: input.studentProfileId,
        subjectId: input.subjectId,
        grandTotal: computed.grandTotal,
        gradeLetter: computed.gradeLetter,
        overrideReason: input.overrideReason,
      },
      req,
    });

    return record;
  },

  async listByClassAndTerm(
    actor: AuthenticatedUser,
    filters: { classId?: string; subjectId?: string; termId: string }
  ) {
    if (actor.role === "student") {
      const { studentProfileId } = await scopeService.getStudentActiveClassIds(actor.id);
      return db
        .select()
        .from(gradebookRecords)
        .where(
          and(
            eq(gradebookRecords.studentProfileId, studentProfileId),
            eq(gradebookRecords.termId, filters.termId),
            eq(gradebookRecords.isPublished, true)
          )
        );
    }

    if (!filters.classId) {
      throw new BadRequestException("classId is required.");
    }

    await scopeService.assertTeacherClassSubjectAccess(
      actor,
      filters.classId,
      filters.subjectId
    );

    const conditions = [
      eq(gradebookRecords.classId, filters.classId),
      eq(gradebookRecords.termId, filters.termId),
    ];
    if (filters.subjectId) {
      conditions.push(eq(gradebookRecords.subjectId, filters.subjectId));
    }

    return db
      .select({
        record: gradebookRecords,
        registrationNumber: studentProfiles.registrationNumber,
        studentName: user.name,
      })
      .from(gradebookRecords)
      .innerJoin(
        studentProfiles,
        eq(gradebookRecords.studentProfileId, studentProfiles.id)
      )
      .innerJoin(user, eq(studentProfiles.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(gradebookRecords.grandTotal));
  },

  async exportClassCsv(
    actor: AuthenticatedUser,
    filters: { classId: string; subjectId?: string; termId: string }
  ): Promise<string> {
    const rows = (await this.listByClassAndTerm(actor, filters)) as Array<{
      record: typeof gradebookRecords.$inferSelect;
      registrationNumber: string;
      studentName: string;
    }>;

    return Papa.unparse(
      rows.map((r) => ({
        registrationNumber: r.registrationNumber,
        studentName: r.studentName,
        ca1: r.record.ca1Score,
        ca2: r.record.ca2Score,
        ca3: r.record.ca3Score,
        ca4: r.record.ca4Score,
        totalCa: r.record.totalCaScore,
        terminalExam: r.record.terminalExamScore,
        grandTotal: r.record.grandTotal,
        grade: r.record.gradeLetter,
        remarks: r.record.remarks,
        atRisk: r.record.isAtRisk ? "YES" : "NO",
      }))
    );
  },
};
