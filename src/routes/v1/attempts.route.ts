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
import { submitLimiter } from "../../middlewares/rateLimiter.middleware";

export const attemptsRoutes = Router();

attemptsRoutes.use(requireAuth, requireMfaForAdmins);

attemptsRoutes.get(
  "/my-results",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  asyncHandler(cbtController.listMyResults)
);

// Staff attempt script review & rubric grading detail
attemptsRoutes.get(
  "/:attemptId",
  requirePermission(PERMISSIONS.EXAM_MONITOR),
  asyncHandler(cbtController.getAttemptDetail)
);

attemptsRoutes.put(
  "/:attemptId/answers",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  asyncHandler(cbtController.saveAnswer)
);

attemptsRoutes.post(
  "/:attemptId/infractions",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  asyncHandler(cbtController.recordInfraction)
);

attemptsRoutes.post(
  "/:attemptId/submit",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  submitLimiter,
  asyncHandler(cbtController.submitAttempt)
);

// Examiner / School Admin live intervention endpoints
attemptsRoutes.post(
  "/:attemptId/force-submit",
  requirePermission(PERMISSIONS.ATTEMPT_FORCE_SUBMIT),
  asyncHandler(cbtController.forceSubmit)
);

attemptsRoutes.post(
  "/:attemptId/unlock-session",
  requirePermission(PERMISSIONS.ATTEMPT_UNLOCK_SESSION),
  asyncHandler(cbtController.unlockSession)
);

// Manual Theory rubric grading
attemptsRoutes.patch(
  "/:attemptId/answers/:answerId/grade",
  requirePermission(PERMISSIONS.ATTEMPT_GRADE_THEORY),
  asyncHandler(examController.gradeTheoryAnswer)
);
