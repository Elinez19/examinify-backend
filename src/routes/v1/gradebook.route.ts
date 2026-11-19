import { Router } from "express";
import { PERMISSIONS } from "../../config/permissions.config";
import { examController } from "../../controllers/exam.controller";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import {
  requireAuth,
  requireMfaForAdmins,
  requirePermission,
} from "../../middlewares/auth.middleware";

export const gradebookRoutes = Router();

gradebookRoutes.use(requireAuth, requireMfaForAdmins);

gradebookRoutes.get(
  "/",
  requirePermission(PERMISSIONS.GRADEBOOK_READ),
  asyncHandler(examController.listGradebook)
);

gradebookRoutes.put(
  "/",
  requirePermission(PERMISSIONS.GRADEBOOK_MANAGE),
  asyncHandler(examController.upsertGradebook)
);

gradebookRoutes.get(
  "/export",
  requirePermission(PERMISSIONS.GRADEBOOK_EXPORT),
  asyncHandler(examController.exportGradebookCsv)
);
