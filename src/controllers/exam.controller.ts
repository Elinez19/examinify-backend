import { Request, Response } from "express";
import { HttpStatus } from "../config/http-status.config";
import { ExamStatus } from "../db/schema/enums";
import { examService } from "../services/exam.service";
import { gradebookService } from "../services/gradebook.service";
import { questionBankService } from "../services/question-bank.service";
import { BadRequestException } from "../utils/app-error";
import {
  aiGenerateQuestionsSchema,
  approveExamSchema,
  createExamSchema,
  createQuestionBankSchema,
  gradeTheoryAnswerSchema,
  publishGradebookSchema,
  releaseExamResultsSchema,
  updateExamSchema,
  upsertGradebookSchema,
} from "../validators/exam.validator";

export const examController = {
  // Question Bank
  async listQuestionBank(req: Request, res: Response) {
    const data = await questionBankService.list(req.auth!.user, {
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : undefined,
      schoolLevel:
        req.query.schoolLevel === "primary" || req.query.schoolLevel === "secondary"
          ? req.query.schoolLevel
          : undefined,
      difficulty:
        req.query.difficulty === "basic" ||
        req.query.difficulty === "intermediate" ||
        req.query.difficulty === "advanced"
          ? req.query.difficulty
          : undefined,
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createQuestionBankItem(req: Request, res: Response) {
    const payload = createQuestionBankSchema.parse(req.body);
    const data = await questionBankService.create(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async deleteQuestionBankItem(req: Request, res: Response) {
    const data = await questionBankService.softDelete(
      req.auth!.user,
      String(req.params.questionId),
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async generateAiQuestions(req: Request, res: Response) {
    const payload = aiGenerateQuestionsSchema.parse(req.body);
    const data = await questionBankService.generateWithAi(req.auth!.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  // Exams
  async listExams(req: Request, res: Response) {
    const data = await examService.list(req.auth!.user, {
      status: typeof req.query.status === "string" ? (req.query.status as ExamStatus) : undefined,
      termId: typeof req.query.termId === "string" ? req.query.termId : undefined,
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async getExamById(req: Request, res: Response) {
    const data = await examService.getById(req.auth!.user, String(req.params.examId));
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async createExam(req: Request, res: Response) {
    const payload = createExamSchema.parse(req.body);
    const data = await examService.create(req.auth!.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },

  async publishExam(req: Request, res: Response) {
    const desired = req.body?.status === "scheduled" ? "scheduled" : "live";
    const data = await examService.publishOrSubmitForApproval(
      req.auth!.user,
      String(req.params.examId),
      desired,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async approveExam(req: Request, res: Response) {
    const payload = approveExamSchema.parse(req.body);
    const data = await examService.approveExam(
      req.auth!.user,
      String(req.params.examId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async updateExam(req: Request, res: Response) {
    const payload = updateExamSchema.parse(req.body);
    const data = await examService.update(
      req.auth!.user,
      String(req.params.examId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async deleteExam(req: Request, res: Response) {
    const data = await examService.softDelete(
      req.auth!.user,
      String(req.params.examId),
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async releaseExamResults(req: Request, res: Response) {
    const payload = releaseExamResultsSchema.parse(req.body ?? {});
    const data = await examService.releaseResults(
      req.auth!.user,
      String(req.params.examId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  // Theory Grading & Gradebook
  async gradeTheoryAnswer(req: Request, res: Response) {
    const payload = gradeTheoryAnswerSchema.parse(req.body);
    const data = await gradebookService.gradeTheoryAnswer(
      req.auth!.user,
      String(req.params.attemptId),
      String(req.params.answerId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async upsertGradebook(req: Request, res: Response) {
    const payload = upsertGradebookSchema.parse(req.body);
    const data = await gradebookService.upsertRecord(req.auth!.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async listGradebook(req: Request, res: Response) {
    const termId = typeof req.query.termId === "string" ? req.query.termId : undefined;
    if (!termId) throw new BadRequestException("termId query parameter is required.");
    const data = await gradebookService.listByClassAndTerm(req.auth!.user, {
      termId,
      classId: typeof req.query.classId === "string" ? req.query.classId : undefined,
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : undefined,
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },

  async exportGradebookCsv(req: Request, res: Response) {
    const termId = typeof req.query.termId === "string" ? req.query.termId : undefined;
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
    if (!termId || !classId) {
      throw new BadRequestException("termId and classId query parameters are required.");
    }
    const csv = await gradebookService.exportClassCsv(req.auth!.user, {
      termId,
      classId,
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : undefined,
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${classId}.csv"`);
    res.status(HttpStatus.OK).send(csv);
  },

  async publishGradebook(req: Request, res: Response) {
    const payload = publishGradebookSchema.parse(req.body);
    const data = await gradebookService.publishRecords(req.auth!.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
};
