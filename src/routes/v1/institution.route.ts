import { Router } from "express";
import { PERMISSIONS } from "../../config/permissions.config";
import { institutionController } from "../../controllers/institution.controller";
import { asyncHandler } from "../../middlewares/asyncHandler.middleware";
import {
  requireAuth,
  requireMfaForAdmins,
  requirePermission,
} from "../../middlewares/auth.middleware";

export const institutionRoutes = Router();

institutionRoutes.use(requireAuth, requireMfaForAdmins);

// Branches & Schools
institutionRoutes.get(
  "/branches",
  requirePermission(PERMISSIONS.INSTITUTION_READ),
  asyncHandler(institutionController.listBranches)
);
institutionRoutes.post(
  "/branches",
  requirePermission(PERMISSIONS.INSTITUTION_MANAGE),
  asyncHandler(institutionController.createBranch)
);
institutionRoutes.get(
  "/schools",
  requirePermission(PERMISSIONS.INSTITUTION_READ),
  asyncHandler(institutionController.listSchools)
);
institutionRoutes.post(
  "/schools",
  requirePermission(PERMISSIONS.INSTITUTION_MANAGE),
  asyncHandler(institutionController.createSchool)
);

// Academic Sessions & Terms
institutionRoutes.get(
  "/academic-sessions",
  requirePermission(PERMISSIONS.INSTITUTION_READ),
  asyncHandler(institutionController.listSessions)
);
institutionRoutes.post(
  "/academic-sessions",
  requirePermission(PERMISSIONS.INSTITUTION_MANAGE),
  asyncHandler(institutionController.createSession)
);
institutionRoutes.post(
  "/terms",
  requirePermission(PERMISSIONS.INSTITUTION_MANAGE),
  asyncHandler(institutionController.createTerm)
);

// Classes, Subjects & Teacher Assignments
institutionRoutes.get(
  "/classes",
  requirePermission(PERMISSIONS.CLASS_READ),
  asyncHandler(institutionController.listClasses)
);
institutionRoutes.post(
  "/classes",
  requirePermission(PERMISSIONS.CLASS_MANAGE),
  asyncHandler(institutionController.createClass)
);
institutionRoutes.get(
  "/classes/:classId/students",
  requirePermission(PERMISSIONS.CLASS_READ),
  asyncHandler(institutionController.listClassStudents)
);
institutionRoutes.get(
  "/subjects",
  requirePermission(PERMISSIONS.SUBJECT_READ),
  asyncHandler(institutionController.listSubjects)
);
institutionRoutes.post(
  "/subjects",
  requirePermission(PERMISSIONS.SUBJECT_MANAGE),
  asyncHandler(institutionController.createSubject)
);
institutionRoutes.get(
  "/teacher-assignments",
  requirePermission(PERMISSIONS.CLASS_READ),
  asyncHandler(institutionController.listTeacherAssignments)
);
institutionRoutes.post(
  "/teacher-assignments",
  requirePermission(PERMISSIONS.ASSIGNMENT_MANAGE),
  asyncHandler(institutionController.createTeacherAssignment)
);

// Attendance (non_academic_staff, teachers, admins)
institutionRoutes.get(
  "/attendance",
  requirePermission(PERMISSIONS.ATTENDANCE_READ),
  asyncHandler(institutionController.listAttendance)
);
institutionRoutes.post(
  "/attendance",
  requirePermission(PERMISSIONS.ATTENDANCE_MANAGE),
  asyncHandler(institutionController.recordAttendance)
);

// Audit Logs
institutionRoutes.get(
  "/audit-logs",
  requirePermission(PERMISSIONS.AUDIT_READ_BRANCH),
  asyncHandler(institutionController.listAuditLogs)
);
