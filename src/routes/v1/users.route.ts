import { Router } from "express";
import { PERMISSIONS } from "../../config/permissions.config";
import { userController } from "../../controllers/user.controller";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import {
  requireAuth,
  requireMfaForAdmins,
  requirePermission,
} from "../../middlewares/auth.middleware";

export const usersRoutes = Router();

// Profile & first-login password change remain accessible before admin 2FA enrollment
usersRoutes.get("/me", requireAuth, asyncHandler(userController.getMe));
usersRoutes.post(
  "/me/change-initial-password",
  requireAuth,
  asyncHandler(userController.completeFirstLogin)
);

// Super Admin provisions School Admins
usersRoutes.post(
  "/school-admins",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_CREATE_SCHOOL_ADMIN),
  asyncHandler(userController.createSchoolAdmin)
);

// School Admins provision Teachers, Examiners, Non-Academic Staff, and Students
usersRoutes.post(
  "/members",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_CREATE_BRANCH_MEMBER),
  asyncHandler(userController.createBranchMember)
);

usersRoutes.post(
  "/import-csv",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_IMPORT_CSV),
  asyncHandler(userController.importMembersCsv)
);

// Directory (accessible to non_academic_staff, school_admin, super_admin)
usersRoutes.get(
  "/directory",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_READ_DIRECTORY),
  asyncHandler(userController.listDirectory)
);

usersRoutes.patch(
  "/:userId/status",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_MANAGE_BRANCH),
  asyncHandler(userController.updateStatus)
);

usersRoutes.patch(
  "/:userId/role",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_MANAGE_BRANCH),
  asyncHandler(userController.updateRole)
);
