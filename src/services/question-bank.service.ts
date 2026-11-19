import { and, desc, eq, isNull, or } from "drizzle-orm";
import { Request } from "express";
import { db } from "../db";
import { questionBankItems } from "../db/schema";
import { AuthenticatedUser } from "../types/express";
import { NotFoundException } from "../utils/app-error";
import { auditService } from "./audit.service";
import { scopeService } from "./scope.service";
import { aiQuestionService } from "./ai-question.service";
import {
  AiGenerateQuestionsInput,
  CreateQuestionBankInput,
} from "../validators/exam.validator";

export const questionBankService = {
  async list(
    actor: AuthenticatedUser,
    filters: { subjectId?: string; schoolLevel?: "primary" | "secondary"; difficulty?: "basic" | "intermediate" | "advanced" }
  ) {
    const conditions = [isNull(questionBankItems.deletedAt)];

    if (actor.role !== "super_admin" && actor.primaryBranchId) {
      // Users see their own branch's questions plus shared institution-wide questions (branchId IS NULL)
      conditions.push(
        or(
          eq(questionBankItems.branchId, actor.primaryBranchId),
          isNull(questionBankItems.branchId)
        )!
      );
    }

    if (filters.subjectId) conditions.push(eq(questionBankItems.subjectId, filters.subjectId));
    if (filters.schoolLevel) conditions.push(eq(questionBankItems.schoolLevel, filters.schoolLevel));
    if (filters.difficulty) conditions.push(eq(questionBankItems.difficulty, filters.difficulty));

    return db
      .select()
      .from(questionBankItems)
      .where(and(...conditions))
      .orderBy(desc(questionBankItems.createdAt))
      .limit(200);
  },

  async create(
    actor: AuthenticatedUser,
    input: CreateQuestionBankInput,
    req?: Request
  ) {
    const branchId =
      input.branchId === null && (actor.role === "super_admin" || actor.role === "examiner")
        ? null
        : input.branchId ?? actor.primaryBranchId ?? null;

    if (branchId) {
      scopeService.assertBranchSchoolScope(actor, { branchId });
    }

    const [created] = await db
      .insert(questionBankItems)
      .values({
        subjectId: input.subjectId,
        branchId,
        schoolLevel: input.schoolLevel,
        createdBy: actor.id,
        type: input.type,
        prompt: input.prompt,
        contextSnippet: input.contextSnippet,
        imageUrl: input.imageUrl,
        imageCaption: input.imageCaption,
        options: input.options,
        correctOptionId: input.correctOptionId,
        shortAnswer: input.shortAnswer,
        acceptedAnswers: input.acceptedAnswers,
        theoryAnswer: input.theoryAnswer,
        rubrics: input.rubrics,
        points: input.points.toFixed(2),
        explanation: input.explanation,
        difficulty: input.difficulty,
        tags: input.tags,
        isAiGenerated: Boolean(input.isAiGenerated),
      })
      .returning();

    await auditService.log({
      action: "question_bank.create",
      entityType: "question_bank_item",
      entityId: created.id,
      branchId,
      metadata: { type: created.type, isAiGenerated: created.isAiGenerated },
      req,
    });

    return created;
  },

  async softDelete(actor: AuthenticatedUser, questionId: string, req?: Request) {
    const [item] = await db
      .select()
      .from(questionBankItems)
      .where(and(eq(questionBankItems.id, questionId), isNull(questionBankItems.deletedAt)))
      .limit(1);

    if (!item) {
      throw new NotFoundException("Question bank item not found.");
    }

    if (item.branchId) {
      scopeService.assertBranchSchoolScope(actor, { branchId: item.branchId });
    }

    await db
      .update(questionBankItems)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(questionBankItems.id, questionId));

    await auditService.log({
      action: "question_bank.delete",
      entityType: "question_bank_item",
      entityId: questionId,
      branchId: item.branchId,
      req,
    });

    return { deleted: true };
  },

  async generateWithAi(
    actor: AuthenticatedUser,
    input: AiGenerateQuestionsInput,
    req?: Request
  ) {
    const drafts = await aiQuestionService.generateDraftQuestions(actor, input);

    if (!input.saveToBank) {
      await auditService.log({
        action: "question_bank.ai_generate",
        entityType: "subject",
        entityId: input.subjectId,
        metadata: { count: drafts.length, saved: false, topic: input.topic },
        req,
      });
      return { saved: false, drafts };
    }

    const savedItems = [];
    for (const draft of drafts) {
      const saved = await this.create(
        actor,
        {
          subjectId: input.subjectId,
          branchId: actor.primaryBranchId ?? null,
          schoolLevel: input.schoolLevel,
          type: input.questionType,
          prompt: draft.prompt,
          contextSnippet: draft.contextSnippet,
          options: draft.options,
          correctOptionId: draft.correctOptionId,
          shortAnswer: draft.shortAnswer,
          acceptedAnswers: draft.acceptedAnswers,
          theoryAnswer: draft.theoryAnswer,
          rubrics: draft.rubrics,
          points: draft.points,
          explanation: draft.explanation,
          difficulty: input.difficulty,
          tags: draft.tags,
          isAiGenerated: true,
        },
        req
      );
      savedItems.push(saved);
    }

    return { saved: true, items: savedItems };
  },
};
