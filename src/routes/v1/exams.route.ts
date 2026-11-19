import { Router } from "express";
import { PERMISSIONS } from "../../config/permissions.config";
import { cbtController } from "../../controllers/cbt.controller";
import { examController } from "../../controllers/exam.controller";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import {
  requireAuth,
  requireMfaForAdmins,
  requirePermission,
} from "../../middlewares/auth.middleware";
import { pinLimiter, submitLimiter } from "../../middlewares/rateLimiter.middleware";

export const examsRoutes = Router();

examsRoutes.use(requireAuth, requireMfaForAdmins);

examsRoutes.get(
  "/",
  requirePermission(PERMISSIONS.EXAM_READ),
  asyncHandler(examController.listExams)
);

examsRoutes.get(
  "/:examId",
  requirePermission(PERMISSIONS.EXAM_READ),
  asyncHandler(examController.getExamById)
);

examsRoutes.post(
  "/",
  requirePermission(PERMISSIONS.EXAM_CREATE),
  asyncHandler(examController.createExam)
);

examsRoutes.post(
  "/:examId/publish",
  requirePermission(PERMISSIONS.EXAM_PUBLISH_CA),
  asyncHandler(examController.publishExam)
);

examsRoutes.post(
  "/:examId/approve",
  requirePermission(PERMISSIONS.EXAM_APPROVE),
  asyncHandler(examController.approveExam)
);

// Student starts or resumes a live CBT attempt
examsRoutes.post(
  "/:examId/attempts/start",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  pinLimiter,
  submitLimiter,
  asyncHandler(cbtController.startAttempt)
);
