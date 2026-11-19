import { UserRole } from "../db/schema/enums";

export const PERMISSIONS = {
  // Institutional management
  INSTITUTION_MANAGE: "institution:manage",
  INSTITUTION_READ: "institution:read",

  // User provisioning & directory
  USER_CREATE_SCHOOL_ADMIN: "user:create:school_admin",
  USER_CREATE_BRANCH_MEMBER: "user:create:branch_member",
  USER_IMPORT_CSV: "user:import:csv",
  USER_MANAGE_BRANCH: "user:manage:branch",
  USER_READ_DIRECTORY: "user:read:directory",

  // Academics & attendance
  CLASS_MANAGE: "class:manage",
  CLASS_READ: "class:read",
  SUBJECT_MANAGE: "subject:manage",
  SUBJECT_READ: "subject:read",
  ASSIGNMENT_MANAGE: "assignment:manage",
  ATTENDANCE_READ: "attendance:read",
  ATTENDANCE_MANAGE: "attendance:manage",

  // Media uploads
  MEDIA_UPLOAD_AVATAR: "media:upload:avatar",
  MEDIA_UPLOAD_DIAGRAM: "media:upload:diagram",

  // Question bank & AI generator
  QUESTION_BANK_READ: "question_bank:read",
  QUESTION_BANK_MANAGE: "question_bank:manage",
  QUESTION_BANK_AI_GENERATE: "question_bank:ai_generate",

  // Exams & CBT lifecycle
  EXAM_READ: "exam:read",
  EXAM_CREATE: "exam:create",
  EXAM_PUBLISH_CA: "exam:publish:ca",
  EXAM_SUBMIT_FOR_APPROVAL: "exam:submit_for_approval",
  EXAM_APPROVE: "exam:approve",
  EXAM_SHARE_CROSS_BRANCH: "exam:share:cross_branch",
  EXAM_PIN_MANAGE: "exam:pin:manage",
  EXAM_MONITOR: "exam:monitor",

  // CBT attempts & grading
  EXAM_TAKE: "exam:take",
  ATTEMPT_FORCE_SUBMIT: "attempt:force_submit",
  ATTEMPT_UNLOCK_SESSION: "attempt:unlock_session",
  ATTEMPT_GRADE_THEORY: "attempt:grade_theory",

  // Gradebook & exports
  GRADEBOOK_READ: "gradebook:read",
  GRADEBOOK_MANAGE: "gradebook:manage",
  GRADEBOOK_OVERRIDE: "gradebook:override",
  GRADEBOOK_PUBLISH: "gradebook:publish",
  GRADEBOOK_EXPORT: "gradebook:export",

  // Audit logs
  AUDIT_READ_ALL: "audit:read:all",
  AUDIT_READ_BRANCH: "audit:read:branch",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  super_admin: new Set<Permission>(ALL_PERMISSIONS),

  school_admin: new Set<Permission>([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.USER_CREATE_BRANCH_MEMBER,
    PERMISSIONS.USER_IMPORT_CSV,
    PERMISSIONS.USER_MANAGE_BRANCH,
    PERMISSIONS.USER_READ_DIRECTORY,
    PERMISSIONS.CLASS_MANAGE,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SUBJECT_MANAGE,
    PERMISSIONS.SUBJECT_READ,
    PERMISSIONS.ASSIGNMENT_MANAGE,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR,
    PERMISSIONS.MEDIA_UPLOAD_DIAGRAM,
    PERMISSIONS.QUESTION_BANK_READ,
    PERMISSIONS.QUESTION_BANK_MANAGE,
    PERMISSIONS.EXAM_READ,
    PERMISSIONS.EXAM_CREATE,
    PERMISSIONS.EXAM_PUBLISH_CA,
    PERMISSIONS.EXAM_APPROVE,
    PERMISSIONS.EXAM_PIN_MANAGE,
    PERMISSIONS.EXAM_MONITOR,
    PERMISSIONS.ATTEMPT_FORCE_SUBMIT,
    PERMISSIONS.ATTEMPT_UNLOCK_SESSION,
    PERMISSIONS.ATTEMPT_GRADE_THEORY,
    PERMISSIONS.GRADEBOOK_READ,
    PERMISSIONS.GRADEBOOK_MANAGE,
    PERMISSIONS.GRADEBOOK_OVERRIDE,
    PERMISSIONS.GRADEBOOK_PUBLISH,
    PERMISSIONS.GRADEBOOK_EXPORT,
    PERMISSIONS.AUDIT_READ_BRANCH,
  ]),

  examiner: new Set<Permission>([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SUBJECT_READ,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR,
    PERMISSIONS.MEDIA_UPLOAD_DIAGRAM,
    PERMISSIONS.QUESTION_BANK_READ,
    PERMISSIONS.QUESTION_BANK_MANAGE,
    PERMISSIONS.EXAM_READ,
    PERMISSIONS.EXAM_CREATE,
    PERMISSIONS.EXAM_PUBLISH_CA,
    PERMISSIONS.EXAM_APPROVE,
    PERMISSIONS.EXAM_SHARE_CROSS_BRANCH,
    PERMISSIONS.EXAM_PIN_MANAGE,
    PERMISSIONS.EXAM_MONITOR,
    PERMISSIONS.ATTEMPT_FORCE_SUBMIT,
    PERMISSIONS.ATTEMPT_UNLOCK_SESSION,
    PERMISSIONS.GRADEBOOK_READ,
    PERMISSIONS.GRADEBOOK_EXPORT,
  ]),

  teacher: new Set<Permission>([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SUBJECT_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR,
    PERMISSIONS.MEDIA_UPLOAD_DIAGRAM,
    PERMISSIONS.QUESTION_BANK_READ,
    PERMISSIONS.QUESTION_BANK_MANAGE,
    PERMISSIONS.QUESTION_BANK_AI_GENERATE,
    PERMISSIONS.EXAM_READ,
    PERMISSIONS.EXAM_CREATE,
    PERMISSIONS.EXAM_PUBLISH_CA,
    PERMISSIONS.EXAM_SUBMIT_FOR_APPROVAL,
    PERMISSIONS.EXAM_MONITOR,
    PERMISSIONS.ATTEMPT_GRADE_THEORY,
    PERMISSIONS.GRADEBOOK_READ,
    PERMISSIONS.GRADEBOOK_MANAGE,
    PERMISSIONS.GRADEBOOK_EXPORT,
  ]),

  non_academic_staff: new Set<Permission>([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.USER_READ_DIRECTORY,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR,
  ]),

  student: new Set<Permission>([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SUBJECT_READ,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR,
    PERMISSIONS.EXAM_READ,
    PERMISSIONS.EXAM_TAKE,
    PERMISSIONS.GRADEBOOK_READ,
  ]),
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
};

/**
 * Enforces strict account provisioning hierarchy:
 * - super_admin creates school_admin accounts
 * - school_admin creates examiner, teacher, non_academic_staff, and student accounts
 */
export const canProvisionRole = (actorRole: UserRole, targetRole: UserRole): boolean => {
  if (actorRole === "super_admin") {
    return targetRole === "school_admin";
  }
  if (actorRole === "school_admin") {
    return (
      targetRole === "examiner" ||
      targetRole === "teacher" ||
      targetRole === "non_academic_staff" ||
      targetRole === "student"
    );
  }
  return false;
};

export const ADMIN_MFA_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "super_admin",
  "school_admin",
]);
