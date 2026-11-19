import { Router } from "express";
import { PERMISSIONS } from "../../config/permissions.config";
import { examController } from "../../controllers/exam.controller";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import {
  requireAuth,
  requireMfaForAdmins,
  requirePermission,
} from "../../middlewares/auth.middleware";
import { aiLimiter } from "../../middlewares/rateLimiter.middleware";

export const questionBankRoutes = Router();

questionBankRoutes.use(requireAuth, requireMfaForAdmins);

questionBankRoutes.get(
  "/",
  requirePermission(PERMISSIONS.QUESTION_BANK_READ),
  asyncHandler(examController.listQuestionBank)
);

questionBankRoutes.post(
  "/",
  requirePermission(PERMISSIONS.QUESTION_BANK_MANAGE),
  asyncHandler(examController.createQuestionBankItem)
);

questionBankRoutes.delete(
  "/:questionId",
  requirePermission(PERMISSIONS.QUESTION_BANK_MANAGE),
  asyncHandler(examController.deleteQuestionBankItem)
);

questionBankRoutes.post(
  "/ai-generate",
  aiLimiter,
  requirePermission(PERMISSIONS.QUESTION_BANK_AI_GENERATE),
  asyncHandler(examController.generateAiQuestions)
);
