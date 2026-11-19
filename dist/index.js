"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc6) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc6 = __getOwnPropDesc(from, key)) || desc6.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  app: () => app,
  server: () => server
});
module.exports = __toCommonJS(index_exports);

// src/config/env.config.ts
var import_dotenv = __toESM(require("dotenv"));
var import_zod = require("zod");
import_dotenv.default.config();
var isTest = process.env.NODE_ENV === "test";
var emptyToUndefined = (val) => typeof val === "string" && val.trim() === "" ? void 0 : val;
var optionalString = import_zod.z.preprocess(emptyToUndefined, import_zod.z.string().min(1).optional());
var optionalUrl = import_zod.z.preprocess(emptyToUndefined, import_zod.z.string().url().optional());
var envSchema = import_zod.z.object({
  NODE_ENV: import_zod.z.enum(["development", "test", "production"]).default("development"),
  PORT: import_zod.z.coerce.number().int().min(1).max(65535).default(5e3),
  LOG_LEVEL: import_zod.z.enum(["error", "warn", "info", "http", "debug"]).default("info"),
  CORS_ORIGIN: import_zod.z.string().default("http://localhost:5173"),
  APP_FRONTEND_URL: import_zod.z.string().url().default("http://localhost:5173"),
  // Neon PostgreSQL Database
  DATABASE_URL: isTest ? import_zod.z.string().default("postgresql://test:test@localhost:5432/examinify_test") : import_zod.z.string().min(1, "DATABASE_URL is required"),
  // Better Auth Configuration (fail-fast, no hardcoded fallback outside test)
  BETTER_AUTH_SECRET: isTest ? import_zod.z.string().min(32).default("test_only_better_auth_secret_minimum_32_chars_long") : import_zod.z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters long"),
  BETTER_AUTH_URL: import_zod.z.string().url().default("http://localhost:5000"),
  // Resend Transactional Email
  RESEND_API_KEY: optionalString,
  RESEND_FROM_EMAIL: import_zod.z.string().default("Examinify <no-reply@examinify.edu.ng>"),
  // Cloudinary Media Uploads
  CLOUDINARY_CLOUD_NAME: optionalString,
  CLOUDINARY_API_KEY: optionalString,
  CLOUDINARY_API_SECRET: optionalString,
  // Upstash Redis (Rate limits, exam session locks, quotas)
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  // Gemini AI Question Generator
  GEMINI_API_KEY: optionalString,
  GEMINI_MODEL: import_zod.z.string().default("gemini-2.5-flash"),
  // Swagger / Docs Gate
  ENABLE_SWAGGER: import_zod.z.enum(["true", "false"]).optional().transform((v) => v === "true"),
  // Bootstrap Super Admin (used by npm run db:seed:bootstrap)
  BOOTSTRAP_SUPER_ADMIN_NAME: import_zod.z.string().default("Examinify Super Admin"),
  BOOTSTRAP_SUPER_ADMIN_USERNAME: import_zod.z.string().default("superadmin"),
  BOOTSTRAP_SUPER_ADMIN_EMAIL: import_zod.z.string().email().default("superadmin@examinify.edu.ng"),
  BOOTSTRAP_SUPER_ADMIN_PASSWORD: optionalString
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === "production") {
    const prodRequired = [
      "RESEND_API_KEY",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN"
    ];
    for (const key of prodRequired) {
      if (!data[key]) {
        ctx.addIssue({
          code: import_zod.z.ZodIssueCode.custom,
          path: [key],
          message: `${key} is required in production mode`
        });
      }
    }
  }
});
var parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const formatted = parsed.error.issues.map((issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:
${formatted}`);
}
var corsOrigins = parsed.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
var Env = {
  ...parsed.data,
  CORS_ORIGINS: corsOrigins
};

// src/app.ts
var import_express9 = __toESM(require("express"));
var import_helmet = __toESM(require("helmet"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));
var import_node3 = require("better-auth/node");

// src/config/auth.config.ts
var import_better_auth = require("better-auth");
var import_drizzle_adapter = require("@better-auth/drizzle-adapter");
var import_plugins = require("better-auth/plugins");
var import_access = require("better-auth/plugins/admin/access");

// src/db/index.ts
var import_serverless = require("@neondatabase/serverless");
var import_neon_serverless = require("drizzle-orm/neon-serverless");
var import_ws = __toESM(require("ws"));

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  academicSessions: () => academicSessions,
  academicSessionsRelations: () => academicSessionsRelations,
  account: () => account,
  accountStatusEnum: () => accountStatusEnum,
  assessmentTypeEnum: () => assessmentTypeEnum,
  attemptAnswers: () => attemptAnswers,
  attemptAnswersRelations: () => attemptAnswersRelations,
  attemptStatusEnum: () => attemptStatusEnum,
  attemptSubjectScores: () => attemptSubjectScores,
  attendanceRecords: () => attendanceRecords,
  attendanceStatusEnum: () => attendanceStatusEnum,
  auditLogs: () => auditLogs,
  branches: () => branches,
  branchesRelations: () => branchesRelations,
  cbtSessionTypeEnum: () => cbtSessionTypeEnum,
  classes: () => classes,
  classesRelations: () => classesRelations,
  difficultyEnum: () => difficultyEnum,
  examAttempts: () => examAttempts,
  examAttemptsRelations: () => examAttemptsRelations,
  examQuestionLinks: () => examQuestionLinks,
  examQuestionSnapshots: () => examQuestionSnapshots,
  examSections: () => examSections,
  examSectionsRelations: () => examSectionsRelations,
  examStatusEnum: () => examStatusEnum,
  examTargetClasses: () => examTargetClasses,
  exams: () => exams,
  examsRelations: () => examsRelations,
  genderEnum: () => genderEnum,
  gradebookRecords: () => gradebookRecords,
  guardians: () => guardians,
  guardiansRelations: () => guardiansRelations,
  proctoringEventTypeEnum: () => proctoringEventTypeEnum,
  proctoringEvents: () => proctoringEvents,
  questionBankItems: () => questionBankItems,
  questionBankItemsRelations: () => questionBankItemsRelations,
  questionTypeEnum: () => questionTypeEnum,
  schoolAssessmentConfigs: () => schoolAssessmentConfigs,
  schoolLevelEnum: () => schoolLevelEnum,
  schools: () => schools,
  schoolsRelations: () => schoolsRelations,
  session: () => session,
  staffCategoryEnum: () => staffCategoryEnum,
  staffProfiles: () => staffProfiles,
  staffProfilesRelations: () => staffProfilesRelations,
  studentEnrollments: () => studentEnrollments,
  studentEnrollmentsRelations: () => studentEnrollmentsRelations,
  studentProfiles: () => studentProfiles,
  studentProfilesRelations: () => studentProfilesRelations,
  subjectCategoryEnum: () => subjectCategoryEnum,
  subjects: () => subjects,
  teacherAssignments: () => teacherAssignments,
  teacherAssignmentsRelations: () => teacherAssignmentsRelations,
  terms: () => terms,
  termsRelations: () => termsRelations,
  twoFactor: () => twoFactor,
  user: () => user,
  userRelations: () => userRelations,
  userRoleEnum: () => userRoleEnum,
  verification: () => verification
});

// src/db/schema/enums.ts
var import_pg_core = require("drizzle-orm/pg-core");
var userRoleEnum = (0, import_pg_core.pgEnum)("user_role", [
  "super_admin",
  "school_admin",
  "examiner",
  "teacher",
  "non_academic_staff",
  "student"
]);
var accountStatusEnum = (0, import_pg_core.pgEnum)("account_status", [
  "pending",
  "active",
  "suspended"
]);
var schoolLevelEnum = (0, import_pg_core.pgEnum)("school_level", ["primary", "secondary"]);
var staffCategoryEnum = (0, import_pg_core.pgEnum)("staff_category", [
  "admin",
  "academic",
  "non_academic"
]);
var assessmentTypeEnum = (0, import_pg_core.pgEnum)("assessment_type", [
  "CA1",
  "CA2",
  "CA3",
  "CA4",
  "Exam"
]);
var questionTypeEnum = (0, import_pg_core.pgEnum)("question_type", [
  "mcq",
  "fill_blanks",
  "theory"
]);
var difficultyEnum = (0, import_pg_core.pgEnum)("difficulty", [
  "basic",
  "intermediate",
  "advanced"
]);
var subjectCategoryEnum = (0, import_pg_core.pgEnum)("subject_category", [
  "Core",
  "Elective",
  "STEM",
  "Humanities",
  "Vocational"
]);
var examStatusEnum = (0, import_pg_core.pgEnum)("exam_status", [
  "draft",
  "pending_approval",
  "scheduled",
  "live",
  "completed",
  "published"
]);
var cbtSessionTypeEnum = (0, import_pg_core.pgEnum)("cbt_session_type", [
  "single_subject_ca",
  "two_subject_daily",
  "national_jamb_mock",
  "term_exam"
]);
var attemptStatusEnum = (0, import_pg_core.pgEnum)("attempt_status", [
  "in_progress",
  "submitted",
  "auto_submitted",
  "flagged",
  "graded"
]);
var proctoringEventTypeEnum = (0, import_pg_core.pgEnum)("proctoring_event_type", [
  "tab_switch",
  "fullscreen_exit",
  "window_blur",
  "copy_attempt",
  "session_conflict",
  "force_submit"
]);
var attendanceStatusEnum = (0, import_pg_core.pgEnum)("attendance_status", [
  "present",
  "absent",
  "late",
  "excused"
]);
var genderEnum = (0, import_pg_core.pgEnum)("gender", ["male", "female"]);

// src/db/schema/institution.schema.ts
var import_pg_core2 = require("drizzle-orm/pg-core");
var branches = (0, import_pg_core2.pgTable)(
  "branches",
  {
    id: (0, import_pg_core2.uuid)("id").defaultRandom().primaryKey(),
    name: (0, import_pg_core2.text)("name").notNull().unique(),
    // Wuse, Guzape, Gwarinpa, Wuye
    code: (0, import_pg_core2.text)("code").notNull().unique(),
    // WUS, GUZ, GWA, WUY
    address: (0, import_pg_core2.text)("address"),
    phone: (0, import_pg_core2.text)("phone"),
    isActive: (0, import_pg_core2.boolean)("is_active").notNull().default(true),
    createdAt: (0, import_pg_core2.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core2.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core2.timestamp)("deleted_at")
  },
  (table) => [(0, import_pg_core2.index)("branches_is_active_idx").on(table.isActive)]
);
var schools = (0, import_pg_core2.pgTable)(
  "schools",
  {
    id: (0, import_pg_core2.uuid)("id").defaultRandom().primaryKey(),
    branchId: (0, import_pg_core2.uuid)("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
    level: schoolLevelEnum("level").notNull(),
    // primary | secondary
    name: (0, import_pg_core2.text)("name").notNull(),
    isActive: (0, import_pg_core2.boolean)("is_active").notNull().default(true),
    createdAt: (0, import_pg_core2.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core2.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core2.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core2.uniqueIndex)("schools_branch_level_uniq").on(table.branchId, table.level),
    (0, import_pg_core2.index)("schools_branch_idx").on(table.branchId)
  ]
);
var academicSessions = (0, import_pg_core2.pgTable)("academic_sessions", {
  id: (0, import_pg_core2.uuid)("id").defaultRandom().primaryKey(),
  label: (0, import_pg_core2.text)("label").notNull().unique(),
  // e.g. "2025/2026"
  isActive: (0, import_pg_core2.boolean)("is_active").notNull().default(false),
  startsAt: (0, import_pg_core2.timestamp)("starts_at"),
  endsAt: (0, import_pg_core2.timestamp)("ends_at"),
  createdAt: (0, import_pg_core2.timestamp)("created_at").notNull().defaultNow(),
  updatedAt: (0, import_pg_core2.timestamp)("updated_at").notNull().defaultNow()
});
var terms = (0, import_pg_core2.pgTable)(
  "terms",
  {
    id: (0, import_pg_core2.uuid)("id").defaultRandom().primaryKey(),
    sessionId: (0, import_pg_core2.uuid)("session_id").notNull().references(() => academicSessions.id, { onDelete: "cascade" }),
    name: (0, import_pg_core2.text)("name").notNull(),
    // "1st Term" | "2nd Term" | "3rd Term"
    orderIndex: (0, import_pg_core2.integer)("order_index").notNull(),
    // 1 | 2 | 3
    isActive: (0, import_pg_core2.boolean)("is_active").notNull().default(false),
    startsAt: (0, import_pg_core2.timestamp)("starts_at"),
    endsAt: (0, import_pg_core2.timestamp)("ends_at"),
    createdAt: (0, import_pg_core2.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core2.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core2.uniqueIndex)("terms_session_order_uniq").on(table.sessionId, table.orderIndex),
    (0, import_pg_core2.index)("terms_session_idx").on(table.sessionId)
  ]
);
var schoolAssessmentConfigs = (0, import_pg_core2.pgTable)(
  "school_assessment_configs",
  {
    id: (0, import_pg_core2.uuid)("id").defaultRandom().primaryKey(),
    schoolId: (0, import_pg_core2.uuid)("school_id").references(() => schools.id, { onDelete: "cascade" }),
    assessmentType: assessmentTypeEnum("assessment_type").notNull(),
    label: (0, import_pg_core2.text)("label").notNull(),
    defaultMaxScore: (0, import_pg_core2.integer)("default_max_score").notNull(),
    weightPercentage: (0, import_pg_core2.integer)("weight_percentage").notNull(),
    createdAt: (0, import_pg_core2.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core2.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core2.uniqueIndex)("school_assessment_config_uniq").on(table.schoolId, table.assessmentType)
  ]
);

// src/db/schema/auth.schema.ts
var import_pg_core3 = require("drizzle-orm/pg-core");
var user = (0, import_pg_core3.pgTable)(
  "user",
  {
    id: (0, import_pg_core3.text)("id").primaryKey(),
    name: (0, import_pg_core3.text)("name").notNull(),
    email: (0, import_pg_core3.text)("email").notNull().unique(),
    emailVerified: (0, import_pg_core3.boolean)("email_verified").notNull().default(false),
    image: (0, import_pg_core3.text)("image"),
    // Better Auth username plugin fields (primary login identifier for all roles)
    username: (0, import_pg_core3.text)("username").unique(),
    displayUsername: (0, import_pg_core3.text)("display_username"),
    // Better Auth admin plugin & RBAC fields
    role: userRoleEnum("role").notNull().default("student"),
    banned: (0, import_pg_core3.boolean)("banned").default(false),
    banReason: (0, import_pg_core3.text)("ban_reason"),
    banExpires: (0, import_pg_core3.timestamp)("ban_expires"),
    // Better Auth twoFactor plugin field
    twoFactorEnabled: (0, import_pg_core3.boolean)("two_factor_enabled").default(false),
    // Examinify provisioning & institutional scoping fields
    status: accountStatusEnum("status").notNull().default("active"),
    mustChangePassword: (0, import_pg_core3.boolean)("must_change_password").notNull().default(false),
    primaryBranchId: (0, import_pg_core3.uuid)("primary_branch_id").references(() => branches.id, {
      onDelete: "set null"
    }),
    primarySchoolId: (0, import_pg_core3.uuid)("primary_school_id").references(() => schools.id, {
      onDelete: "set null"
    }),
    createdAt: (0, import_pg_core3.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core3.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core3.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core3.index)("user_role_idx").on(table.role),
    (0, import_pg_core3.index)("user_branch_school_idx").on(table.primaryBranchId, table.primarySchoolId)
  ]
);
var session = (0, import_pg_core3.pgTable)(
  "session",
  {
    id: (0, import_pg_core3.text)("id").primaryKey(),
    expiresAt: (0, import_pg_core3.timestamp)("expires_at").notNull(),
    token: (0, import_pg_core3.text)("token").notNull().unique(),
    createdAt: (0, import_pg_core3.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core3.timestamp)("updated_at").notNull().defaultNow(),
    ipAddress: (0, import_pg_core3.text)("ip_address"),
    userAgent: (0, import_pg_core3.text)("user_agent"),
    impersonatedBy: (0, import_pg_core3.text)("impersonated_by"),
    userId: (0, import_pg_core3.text)("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [(0, import_pg_core3.index)("session_user_idx").on(table.userId)]
);
var account = (0, import_pg_core3.pgTable)(
  "account",
  {
    id: (0, import_pg_core3.text)("id").primaryKey(),
    accountId: (0, import_pg_core3.text)("account_id").notNull(),
    providerId: (0, import_pg_core3.text)("provider_id").notNull(),
    userId: (0, import_pg_core3.text)("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    accessToken: (0, import_pg_core3.text)("access_token"),
    refreshToken: (0, import_pg_core3.text)("refresh_token"),
    idToken: (0, import_pg_core3.text)("id_token"),
    accessTokenExpiresAt: (0, import_pg_core3.timestamp)("access_token_expires_at"),
    refreshTokenExpiresAt: (0, import_pg_core3.timestamp)("refresh_token_expires_at"),
    scope: (0, import_pg_core3.text)("scope"),
    password: (0, import_pg_core3.text)("password"),
    createdAt: (0, import_pg_core3.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core3.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [(0, import_pg_core3.index)("account_user_idx").on(table.userId)]
);
var verification = (0, import_pg_core3.pgTable)(
  "verification",
  {
    id: (0, import_pg_core3.text)("id").primaryKey(),
    identifier: (0, import_pg_core3.text)("identifier").notNull(),
    value: (0, import_pg_core3.text)("value").notNull(),
    expiresAt: (0, import_pg_core3.timestamp)("expires_at").notNull(),
    createdAt: (0, import_pg_core3.timestamp)("created_at").defaultNow(),
    updatedAt: (0, import_pg_core3.timestamp)("updated_at").defaultNow()
  },
  (table) => [(0, import_pg_core3.index)("verification_identifier_idx").on(table.identifier)]
);
var twoFactor = (0, import_pg_core3.pgTable)(
  "two_factor",
  {
    id: (0, import_pg_core3.text)("id").primaryKey(),
    secret: (0, import_pg_core3.text)("secret").notNull(),
    backupCodes: (0, import_pg_core3.text)("backup_codes").notNull(),
    verified: (0, import_pg_core3.boolean)("verified").notNull().default(false),
    failedVerificationCount: (0, import_pg_core3.integer)("failed_verification_count").notNull().default(0),
    lockedUntil: (0, import_pg_core3.timestamp)("locked_until"),
    userId: (0, import_pg_core3.text)("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
  },
  (table) => [(0, import_pg_core3.index)("two_factor_user_idx").on(table.userId)]
);

// src/db/schema/people.schema.ts
var import_pg_core4 = require("drizzle-orm/pg-core");
var classes = (0, import_pg_core4.pgTable)(
  "classes",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    schoolId: (0, import_pg_core4.uuid)("school_id").notNull().references(() => schools.id, { onDelete: "restrict" }),
    sessionId: (0, import_pg_core4.uuid)("session_id").notNull().references(() => academicSessions.id, { onDelete: "restrict" }),
    name: (0, import_pg_core4.text)("name").notNull(),
    // e.g. "SS 1 Explorers", "Grade 4 Diamond"
    code: (0, import_pg_core4.text)("code").notNull(),
    // e.g. "SS1-EXP", "G4-DIA"
    gradeLevel: (0, import_pg_core4.text)("grade_level").notNull(),
    // e.g. "SS 1", "Grade 4"
    department: (0, import_pg_core4.text)("department"),
    // Science | Arts | Commercial (Secondary)
    room: (0, import_pg_core4.text)("room"),
    formMasterId: (0, import_pg_core4.text)("form_master_id").references(() => user.id, {
      onDelete: "set null"
    }),
    isPrimarySelfContained: (0, import_pg_core4.boolean)("is_primary_self_contained").notNull().default(false),
    description: (0, import_pg_core4.text)("description"),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core4.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core4.uniqueIndex)("classes_school_session_code_uniq").on(
      table.schoolId,
      table.sessionId,
      table.code
    ),
    (0, import_pg_core4.index)("classes_school_idx").on(table.schoolId)
  ]
);
var subjects = (0, import_pg_core4.pgTable)(
  "subjects",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    schoolId: (0, import_pg_core4.uuid)("school_id").references(() => schools.id, { onDelete: "set null" }),
    schoolLevel: schoolLevelEnum("school_level").notNull(),
    name: (0, import_pg_core4.text)("name").notNull(),
    // e.g. "Mathematics", "English Language"
    code: (0, import_pg_core4.text)("code").notNull(),
    // e.g. "MTH", "ENG"
    category: subjectCategoryEnum("category").notNull().default("Core"),
    department: (0, import_pg_core4.text)("department"),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core4.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core4.index)("subjects_school_level_idx").on(table.schoolLevel),
    (0, import_pg_core4.index)("subjects_school_idx").on(table.schoolId)
  ]
);
var studentProfiles = (0, import_pg_core4.pgTable)(
  "student_profiles",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, import_pg_core4.text)("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
    registrationNumber: (0, import_pg_core4.text)("registration_number").notNull().unique(),
    gender: genderEnum("gender").notNull().default("male"),
    phone: (0, import_pg_core4.text)("phone"),
    gradeLevel: (0, import_pg_core4.text)("grade_level").notNull(),
    department: (0, import_pg_core4.text)("department"),
    targetExamTrack: (0, import_pg_core4.text)("target_exam_track"),
    // e.g. "WAEC / JAMB"
    targetExamYear: (0, import_pg_core4.text)("target_exam_year"),
    enrolledDate: (0, import_pg_core4.date)("enrolled_date").notNull().defaultNow(),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core4.timestamp)("deleted_at")
  },
  (table) => [(0, import_pg_core4.index)("student_profiles_reg_no_idx").on(table.registrationNumber)]
);
var guardians = (0, import_pg_core4.pgTable)(
  "guardians",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    studentProfileId: (0, import_pg_core4.uuid)("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
    fullName: (0, import_pg_core4.text)("full_name").notNull(),
    relationship: (0, import_pg_core4.text)("relationship").notNull(),
    phone: (0, import_pg_core4.text)("phone").notNull(),
    email: (0, import_pg_core4.text)("email"),
    address: (0, import_pg_core4.text)("address"),
    isPrimary: (0, import_pg_core4.boolean)("is_primary").notNull().default(true),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [(0, import_pg_core4.index)("guardians_student_idx").on(table.studentProfileId)]
);
var studentEnrollments = (0, import_pg_core4.pgTable)(
  "student_enrollments",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    studentProfileId: (0, import_pg_core4.uuid)("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
    classId: (0, import_pg_core4.uuid)("class_id").notNull().references(() => classes.id, { onDelete: "restrict" }),
    sessionId: (0, import_pg_core4.uuid)("session_id").notNull().references(() => academicSessions.id, { onDelete: "restrict" }),
    isActive: (0, import_pg_core4.boolean)("is_active").notNull().default(true),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core4.uniqueIndex)("student_enrollments_student_session_uniq").on(
      table.studentProfileId,
      table.sessionId
    ),
    (0, import_pg_core4.index)("student_enrollments_class_idx").on(table.classId)
  ]
);
var staffProfiles = (0, import_pg_core4.pgTable)(
  "staff_profiles",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, import_pg_core4.text)("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
    staffId: (0, import_pg_core4.text)("staff_id").notNull().unique(),
    staffCategory: staffCategoryEnum("staff_category").notNull(),
    title: (0, import_pg_core4.text)("title"),
    // e.g. "Senior Mathematics Teacher", "Principal"
    phone: (0, import_pg_core4.text)("phone"),
    department: (0, import_pg_core4.text)("department"),
    qualifications: (0, import_pg_core4.jsonb)("qualifications").$type().notNull().default([]),
    specializations: (0, import_pg_core4.jsonb)("specializations").$type().notNull().default([]),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core4.timestamp)("deleted_at")
  },
  (table) => [(0, import_pg_core4.index)("staff_profiles_staff_id_idx").on(table.staffId)]
);
var teacherAssignments = (0, import_pg_core4.pgTable)(
  "teacher_assignments",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    staffProfileId: (0, import_pg_core4.uuid)("staff_profile_id").notNull().references(() => staffProfiles.id, { onDelete: "cascade" }),
    branchId: (0, import_pg_core4.uuid)("branch_id").notNull().references(() => branches.id, { onDelete: "restrict" }),
    schoolId: (0, import_pg_core4.uuid)("school_id").notNull().references(() => schools.id, { onDelete: "restrict" }),
    classId: (0, import_pg_core4.uuid)("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: (0, import_pg_core4.uuid)("subject_id").references(() => subjects.id, {
      onDelete: "cascade"
    }),
    sessionId: (0, import_pg_core4.uuid)("session_id").notNull().references(() => academicSessions.id, { onDelete: "restrict" }),
    isAllClassSubjects: (0, import_pg_core4.boolean)("is_all_class_subjects").notNull().default(false),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core4.index)("teacher_assignments_staff_idx").on(table.staffProfileId),
    (0, import_pg_core4.index)("teacher_assignments_class_subject_idx").on(table.classId, table.subjectId)
  ]
);
var attendanceRecords = (0, import_pg_core4.pgTable)(
  "attendance_records",
  {
    id: (0, import_pg_core4.uuid)("id").defaultRandom().primaryKey(),
    studentProfileId: (0, import_pg_core4.uuid)("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
    classId: (0, import_pg_core4.uuid)("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    termId: (0, import_pg_core4.uuid)("term_id").notNull().references(() => terms.id, { onDelete: "restrict" }),
    date: (0, import_pg_core4.date)("date").notNull(),
    status: attendanceStatusEnum("status").notNull().default("present"),
    recordedBy: (0, import_pg_core4.text)("recorded_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    remarks: (0, import_pg_core4.text)("remarks"),
    createdAt: (0, import_pg_core4.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core4.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core4.uniqueIndex)("attendance_student_date_uniq").on(table.studentProfileId, table.date),
    (0, import_pg_core4.index)("attendance_class_date_idx").on(table.classId, table.date)
  ]
);

// src/db/schema/exam.schema.ts
var import_pg_core5 = require("drizzle-orm/pg-core");
var questionBankItems = (0, import_pg_core5.pgTable)(
  "question_bank_items",
  {
    id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
    subjectId: (0, import_pg_core5.uuid)("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    branchId: (0, import_pg_core5.uuid)("branch_id").references(() => branches.id, { onDelete: "set null" }),
    schoolLevel: schoolLevelEnum("school_level").notNull(),
    createdBy: (0, import_pg_core5.text)("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    type: questionTypeEnum("type").notNull(),
    prompt: (0, import_pg_core5.text)("prompt").notNull(),
    contextSnippet: (0, import_pg_core5.text)("context_snippet"),
    imageUrl: (0, import_pg_core5.text)("image_url"),
    imageCaption: (0, import_pg_core5.text)("image_caption"),
    options: (0, import_pg_core5.jsonb)("options").$type(),
    correctOptionId: (0, import_pg_core5.text)("correct_option_id"),
    shortAnswer: (0, import_pg_core5.text)("short_answer"),
    acceptedAnswers: (0, import_pg_core5.jsonb)("accepted_answers").$type(),
    theoryAnswer: (0, import_pg_core5.text)("theory_answer"),
    rubrics: (0, import_pg_core5.jsonb)("rubrics").$type(),
    points: (0, import_pg_core5.numeric)("points", { precision: 6, scale: 2 }).notNull().default("1.00"),
    explanation: (0, import_pg_core5.text)("explanation"),
    difficulty: difficultyEnum("difficulty").notNull().default("intermediate"),
    tags: (0, import_pg_core5.jsonb)("tags").$type().notNull().default([]),
    isAiGenerated: (0, import_pg_core5.boolean)("is_ai_generated").notNull().default(false),
    createdAt: (0, import_pg_core5.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core5.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core5.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core5.index)("question_bank_subject_idx").on(table.subjectId),
    (0, import_pg_core5.index)("question_bank_branch_idx").on(table.branchId),
    (0, import_pg_core5.index)("question_bank_created_by_idx").on(table.createdBy)
  ]
);
var exams = (0, import_pg_core5.pgTable)(
  "exams",
  {
    id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
    title: (0, import_pg_core5.text)("title").notNull(),
    branchId: (0, import_pg_core5.uuid)("branch_id").references(() => branches.id, { onDelete: "set null" }),
    schoolId: (0, import_pg_core5.uuid)("school_id").references(() => schools.id, { onDelete: "set null" }),
    schoolLevel: schoolLevelEnum("school_level").notNull(),
    sessionId: (0, import_pg_core5.uuid)("session_id").notNull().references(() => academicSessions.id, { onDelete: "restrict" }),
    termId: (0, import_pg_core5.uuid)("term_id").notNull().references(() => terms.id, { onDelete: "restrict" }),
    createdBy: (0, import_pg_core5.text)("created_by").notNull().references(() => user.id, { onDelete: "restrict" }),
    approvedBy: (0, import_pg_core5.text)("approved_by").references(() => user.id, { onDelete: "set null" }),
    approvedAt: (0, import_pg_core5.timestamp)("approved_at"),
    sessionType: cbtSessionTypeEnum("session_type").notNull().default("single_subject_ca"),
    assessmentType: assessmentTypeEnum("assessment_type").notNull().default("CA1"),
    status: examStatusEnum("status").notNull().default("draft"),
    instructions: (0, import_pg_core5.jsonb)("instructions").$type().notNull().default([]),
    durationMinutes: (0, import_pg_core5.integer)("duration_minutes").notNull(),
    passingScore: (0, import_pg_core5.numeric)("passing_score", { precision: 5, scale: 2 }).notNull().default("50.00"),
    scheduledAt: (0, import_pg_core5.timestamp)("scheduled_at"),
    endsAt: (0, import_pg_core5.timestamp)("ends_at"),
    accessPinHash: (0, import_pg_core5.text)("access_pin_hash"),
    // CBT Runner Controls
    allowCalculator: (0, import_pg_core5.boolean)("allow_calculator").notNull().default(false),
    shuffleQuestions: (0, import_pg_core5.boolean)("shuffle_questions").notNull().default(true),
    shuffleOptions: (0, import_pg_core5.boolean)("shuffle_options").notNull().default(true),
    allowBackwardNavigation: (0, import_pg_core5.boolean)("allow_backward_navigation").notNull().default(true),
    strictProctoring: (0, import_pg_core5.boolean)("strict_proctoring").notNull().default(true),
    maxInfractions: (0, import_pg_core5.integer)("max_infractions").notNull().default(3),
    maxTabSwitches: (0, import_pg_core5.integer)("max_tab_switches").notNull().default(3),
    autoPublishResults: (0, import_pg_core5.boolean)("auto_publish_results").notNull().default(false),
    showStudentFeedback: (0, import_pg_core5.boolean)("show_student_feedback").notNull().default(true),
    showCorrectAnswers: (0, import_pg_core5.boolean)("show_correct_answers").notNull().default(false),
    enableLiveMonitoring: (0, import_pg_core5.boolean)("enable_live_monitoring").notNull().default(true),
    createdAt: (0, import_pg_core5.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core5.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core5.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core5.index)("exams_branch_school_idx").on(table.branchId, table.schoolId),
    (0, import_pg_core5.index)("exams_status_idx").on(table.status),
    (0, import_pg_core5.index)("exams_term_idx").on(table.termId)
  ]
);
var examTargetClasses = (0, import_pg_core5.pgTable)(
  "exam_target_classes",
  {
    id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
    examId: (0, import_pg_core5.uuid)("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    classId: (0, import_pg_core5.uuid)("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    createdAt: (0, import_pg_core5.timestamp)("created_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core5.uniqueIndex)("exam_target_classes_uniq").on(table.examId, table.classId),
    (0, import_pg_core5.index)("exam_target_classes_class_idx").on(table.classId)
  ]
);
var examSections = (0, import_pg_core5.pgTable)(
  "exam_sections",
  {
    id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
    examId: (0, import_pg_core5.uuid)("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    subjectId: (0, import_pg_core5.uuid)("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    title: (0, import_pg_core5.text)("title").notNull(),
    orderIndex: (0, import_pg_core5.integer)("order_index").notNull().default(0),
    totalQuestions: (0, import_pg_core5.integer)("total_questions").notNull().default(0),
    maxScore: (0, import_pg_core5.numeric)("max_score", { precision: 6, scale: 2 }).notNull().default("0.00"),
    createdAt: (0, import_pg_core5.timestamp)("created_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core5.uniqueIndex)("exam_sections_exam_subject_uniq").on(table.examId, table.subjectId),
    (0, import_pg_core5.index)("exam_sections_exam_idx").on(table.examId)
  ]
);
var examQuestionLinks = (0, import_pg_core5.pgTable)(
  "exam_question_links",
  {
    id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
    examId: (0, import_pg_core5.uuid)("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    sectionId: (0, import_pg_core5.uuid)("section_id").notNull().references(() => examSections.id, { onDelete: "cascade" }),
    questionBankItemId: (0, import_pg_core5.uuid)("question_bank_item_id").notNull().references(() => questionBankItems.id, { onDelete: "restrict" }),
    orderIndex: (0, import_pg_core5.integer)("order_index").notNull().default(0),
    pointsOverride: (0, import_pg_core5.numeric)("points_override", { precision: 6, scale: 2 })
  },
  (table) => [
    (0, import_pg_core5.uniqueIndex)("exam_question_links_uniq").on(table.examId, table.questionBankItemId),
    (0, import_pg_core5.index)("exam_question_links_section_idx").on(table.sectionId)
  ]
);
var examQuestionSnapshots = (0, import_pg_core5.pgTable)(
  "exam_question_snapshots",
  {
    id: (0, import_pg_core5.uuid)("id").defaultRandom().primaryKey(),
    examId: (0, import_pg_core5.uuid)("exam_id").notNull().references(() => exams.id, { onDelete: "cascade" }),
    sectionId: (0, import_pg_core5.uuid)("section_id").notNull().references(() => examSections.id, { onDelete: "cascade" }),
    subjectId: (0, import_pg_core5.uuid)("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    sourceQuestionId: (0, import_pg_core5.uuid)("source_question_id").references(() => questionBankItems.id, {
      onDelete: "set null"
    }),
    questionNumber: (0, import_pg_core5.integer)("question_number").notNull(),
    type: questionTypeEnum("type").notNull(),
    prompt: (0, import_pg_core5.text)("prompt").notNull(),
    contextSnippet: (0, import_pg_core5.text)("context_snippet"),
    imageUrl: (0, import_pg_core5.text)("image_url"),
    imageCaption: (0, import_pg_core5.text)("image_caption"),
    options: (0, import_pg_core5.jsonb)("options").$type(),
    correctOptionId: (0, import_pg_core5.text)("correct_option_id"),
    shortAnswer: (0, import_pg_core5.text)("short_answer"),
    acceptedAnswers: (0, import_pg_core5.jsonb)("accepted_answers").$type(),
    theoryAnswer: (0, import_pg_core5.text)("theory_answer"),
    rubrics: (0, import_pg_core5.jsonb)("rubrics").$type(),
    points: (0, import_pg_core5.numeric)("points", { precision: 6, scale: 2 }).notNull().default("1.00"),
    explanation: (0, import_pg_core5.text)("explanation"),
    createdAt: (0, import_pg_core5.timestamp)("created_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core5.index)("exam_question_snapshots_exam_idx").on(table.examId),
    (0, import_pg_core5.index)("exam_question_snapshots_section_idx").on(table.sectionId)
  ]
);

// src/db/schema/cbt.schema.ts
var import_pg_core6 = require("drizzle-orm/pg-core");
var examAttempts = (0, import_pg_core6.pgTable)(
  "exam_attempts",
  {
    id: (0, import_pg_core6.uuid)("id").defaultRandom().primaryKey(),
    examId: (0, import_pg_core6.uuid)("exam_id").notNull().references(() => exams.id, { onDelete: "restrict" }),
    studentProfileId: (0, import_pg_core6.uuid)("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
    userId: (0, import_pg_core6.text)("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    lockedSessionId: (0, import_pg_core6.text)("locked_session_id"),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    questionOrder: (0, import_pg_core6.jsonb)("question_order").$type().notNull().default([]),
    optionOrders: (0, import_pg_core6.jsonb)("option_orders").$type().notNull().default({}),
    startedAt: (0, import_pg_core6.timestamp)("started_at").notNull().defaultNow(),
    serverExpiresAt: (0, import_pg_core6.timestamp)("server_expires_at").notNull(),
    submittedAt: (0, import_pg_core6.timestamp)("submitted_at"),
    infractionCount: (0, import_pg_core6.integer)("infraction_count").notNull().default(0),
    aggregateScore: (0, import_pg_core6.numeric)("aggregate_score", { precision: 7, scale: 2 }),
    maxPossibleScore: (0, import_pg_core6.numeric)("max_possible_score", { precision: 7, scale: 2 }),
    aggregatePercentage: (0, import_pg_core6.numeric)("aggregate_percentage", { precision: 5, scale: 2 }),
    gradeLetter: (0, import_pg_core6.text)("grade_letter"),
    performanceRemark: (0, import_pg_core6.text)("performance_remark"),
    isPassed: (0, import_pg_core6.boolean)("is_passed"),
    resultsReleased: (0, import_pg_core6.boolean)("results_released").notNull().default(false),
    ipAddress: (0, import_pg_core6.text)("ip_address"),
    userAgent: (0, import_pg_core6.text)("user_agent"),
    createdAt: (0, import_pg_core6.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core6.timestamp)("updated_at").notNull().defaultNow(),
    deletedAt: (0, import_pg_core6.timestamp)("deleted_at")
  },
  (table) => [
    (0, import_pg_core6.uniqueIndex)("exam_attempts_exam_student_uniq").on(table.examId, table.studentProfileId),
    (0, import_pg_core6.index)("exam_attempts_status_expires_idx").on(table.status, table.serverExpiresAt),
    (0, import_pg_core6.index)("exam_attempts_user_idx").on(table.userId)
  ]
);
var attemptAnswers = (0, import_pg_core6.pgTable)(
  "attempt_answers",
  {
    id: (0, import_pg_core6.uuid)("id").defaultRandom().primaryKey(),
    attemptId: (0, import_pg_core6.uuid)("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    snapshotQuestionId: (0, import_pg_core6.uuid)("snapshot_question_id").notNull().references(() => examQuestionSnapshots.id, { onDelete: "cascade" }),
    selectedOptionId: (0, import_pg_core6.text)("selected_option_id"),
    textResponse: (0, import_pg_core6.text)("text_response"),
    isFlagged: (0, import_pg_core6.boolean)("is_flagged").notNull().default(false),
    isVisited: (0, import_pg_core6.boolean)("is_visited").notNull().default(true),
    isCorrect: (0, import_pg_core6.boolean)("is_correct"),
    awardedPoints: (0, import_pg_core6.numeric)("awarded_points", { precision: 6, scale: 2 }),
    rubricBreakdown: (0, import_pg_core6.jsonb)("rubric_breakdown").$type(),
    graderFeedback: (0, import_pg_core6.text)("grader_feedback"),
    gradedBy: (0, import_pg_core6.text)("graded_by").references(() => user.id, { onDelete: "set null" }),
    gradedAt: (0, import_pg_core6.timestamp)("graded_at"),
    updatedAt: (0, import_pg_core6.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core6.uniqueIndex)("attempt_answers_attempt_question_uniq").on(
      table.attemptId,
      table.snapshotQuestionId
    ),
    (0, import_pg_core6.index)("attempt_answers_attempt_idx").on(table.attemptId)
  ]
);
var proctoringEvents = (0, import_pg_core6.pgTable)(
  "proctoring_events",
  {
    id: (0, import_pg_core6.uuid)("id").defaultRandom().primaryKey(),
    attemptId: (0, import_pg_core6.uuid)("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    eventType: proctoringEventTypeEnum("event_type").notNull(),
    details: (0, import_pg_core6.jsonb)("details").$type().notNull().default({}),
    occurredAt: (0, import_pg_core6.timestamp)("occurred_at").notNull().defaultNow()
  },
  (table) => [(0, import_pg_core6.index)("proctoring_events_attempt_idx").on(table.attemptId)]
);
var attemptSubjectScores = (0, import_pg_core6.pgTable)(
  "attempt_subject_scores",
  {
    id: (0, import_pg_core6.uuid)("id").defaultRandom().primaryKey(),
    attemptId: (0, import_pg_core6.uuid)("attempt_id").notNull().references(() => examAttempts.id, { onDelete: "cascade" }),
    subjectId: (0, import_pg_core6.uuid)("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    totalQuestions: (0, import_pg_core6.integer)("total_questions").notNull(),
    attemptedQuestions: (0, import_pg_core6.integer)("attempted_questions").notNull(),
    correctAnswers: (0, import_pg_core6.integer)("correct_answers").notNull(),
    rawScore: (0, import_pg_core6.numeric)("raw_score", { precision: 7, scale: 2 }).notNull(),
    maxScore: (0, import_pg_core6.numeric)("max_score", { precision: 7, scale: 2 }).notNull(),
    percentage: (0, import_pg_core6.numeric)("percentage", { precision: 5, scale: 2 }).notNull(),
    gradeLetter: (0, import_pg_core6.text)("grade_letter").notNull(),
    timeSpentSeconds: (0, import_pg_core6.integer)("time_spent_seconds").notNull().default(0),
    createdAt: (0, import_pg_core6.timestamp)("created_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core6.uniqueIndex)("attempt_subject_scores_uniq").on(table.attemptId, table.subjectId)
  ]
);
var gradebookRecords = (0, import_pg_core6.pgTable)(
  "gradebook_records",
  {
    id: (0, import_pg_core6.uuid)("id").defaultRandom().primaryKey(),
    studentProfileId: (0, import_pg_core6.uuid)("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
    classId: (0, import_pg_core6.uuid)("class_id").notNull().references(() => classes.id, { onDelete: "restrict" }),
    subjectId: (0, import_pg_core6.uuid)("subject_id").notNull().references(() => subjects.id, { onDelete: "restrict" }),
    sessionId: (0, import_pg_core6.uuid)("session_id").notNull().references(() => academicSessions.id, { onDelete: "restrict" }),
    termId: (0, import_pg_core6.uuid)("term_id").notNull().references(() => terms.id, { onDelete: "restrict" }),
    ca1Score: (0, import_pg_core6.numeric)("ca1_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    ca2Score: (0, import_pg_core6.numeric)("ca2_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    ca3Score: (0, import_pg_core6.numeric)("ca3_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    ca4Score: (0, import_pg_core6.numeric)("ca4_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    totalCaScore: (0, import_pg_core6.numeric)("total_ca_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    terminalExamScore: (0, import_pg_core6.numeric)("terminal_exam_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    grandTotal: (0, import_pg_core6.numeric)("grand_total", { precision: 5, scale: 2 }).notNull().default("0.00"),
    gradeLetter: (0, import_pg_core6.text)("grade_letter").notNull().default("F9"),
    remarks: (0, import_pg_core6.text)("remarks").notNull().default("Fail"),
    isAtRisk: (0, import_pg_core6.boolean)("is_at_risk").notNull().default(false),
    isPublished: (0, import_pg_core6.boolean)("is_published").notNull().default(false),
    updatedBy: (0, import_pg_core6.text)("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: (0, import_pg_core6.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, import_pg_core6.timestamp)("updated_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core6.uniqueIndex)("gradebook_student_subject_term_uniq").on(
      table.studentProfileId,
      table.subjectId,
      table.termId
    ),
    (0, import_pg_core6.index)("gradebook_class_term_idx").on(table.classId, table.termId)
  ]
);

// src/db/schema/audit.schema.ts
var import_pg_core7 = require("drizzle-orm/pg-core");
var auditLogs = (0, import_pg_core7.pgTable)(
  "audit_logs",
  {
    id: (0, import_pg_core7.uuid)("id").defaultRandom().primaryKey(),
    actorUserId: (0, import_pg_core7.text)("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorRole: (0, import_pg_core7.text)("actor_role"),
    branchId: (0, import_pg_core7.uuid)("branch_id").references(() => branches.id, { onDelete: "set null" }),
    schoolId: (0, import_pg_core7.uuid)("school_id").references(() => schools.id, { onDelete: "set null" }),
    action: (0, import_pg_core7.text)("action").notNull(),
    entityType: (0, import_pg_core7.text)("entity_type").notNull(),
    entityId: (0, import_pg_core7.text)("entity_id"),
    metadata: (0, import_pg_core7.jsonb)("metadata").$type().notNull().default({}),
    ipAddress: (0, import_pg_core7.text)("ip_address"),
    userAgent: (0, import_pg_core7.text)("user_agent"),
    createdAt: (0, import_pg_core7.timestamp)("created_at").notNull().defaultNow()
  },
  (table) => [
    (0, import_pg_core7.index)("audit_logs_actor_idx").on(table.actorUserId),
    (0, import_pg_core7.index)("audit_logs_action_idx").on(table.action),
    (0, import_pg_core7.index)("audit_logs_branch_idx").on(table.branchId),
    (0, import_pg_core7.index)("audit_logs_created_at_idx").on(table.createdAt)
  ]
);

// src/db/schema/relations.ts
var import_drizzle_orm = require("drizzle-orm");
var branchesRelations = (0, import_drizzle_orm.relations)(branches, ({ many }) => ({
  schools: many(schools)
}));
var schoolsRelations = (0, import_drizzle_orm.relations)(schools, ({ one, many }) => ({
  branch: one(branches, { fields: [schools.branchId], references: [branches.id] }),
  classes: many(classes),
  subjects: many(subjects),
  assessmentConfigs: many(schoolAssessmentConfigs)
}));
var academicSessionsRelations = (0, import_drizzle_orm.relations)(academicSessions, ({ many }) => ({
  terms: many(terms),
  classes: many(classes)
}));
var termsRelations = (0, import_drizzle_orm.relations)(terms, ({ one }) => ({
  session: one(academicSessions, {
    fields: [terms.sessionId],
    references: [academicSessions.id]
  })
}));
var userRelations = (0, import_drizzle_orm.relations)(user, ({ one, many }) => ({
  primaryBranch: one(branches, {
    fields: [user.primaryBranchId],
    references: [branches.id]
  }),
  primarySchool: one(schools, {
    fields: [user.primarySchoolId],
    references: [schools.id]
  }),
  studentProfile: one(studentProfiles, {
    fields: [user.id],
    references: [studentProfiles.userId]
  }),
  staffProfile: one(staffProfiles, {
    fields: [user.id],
    references: [staffProfiles.userId]
  }),
  sessions: many(session),
  accounts: many(account),
  twoFactors: many(twoFactor),
  auditLogs: many(auditLogs)
}));
var studentProfilesRelations = (0, import_drizzle_orm.relations)(studentProfiles, ({ one, many }) => ({
  user: one(user, { fields: [studentProfiles.userId], references: [user.id] }),
  guardians: many(guardians),
  enrollments: many(studentEnrollments),
  attempts: many(examAttempts),
  gradebookRecords: many(gradebookRecords),
  attendanceRecords: many(attendanceRecords)
}));
var guardiansRelations = (0, import_drizzle_orm.relations)(guardians, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [guardians.studentProfileId],
    references: [studentProfiles.id]
  })
}));
var staffProfilesRelations = (0, import_drizzle_orm.relations)(staffProfiles, ({ one, many }) => ({
  user: one(user, { fields: [staffProfiles.userId], references: [user.id] }),
  assignments: many(teacherAssignments)
}));
var classesRelations = (0, import_drizzle_orm.relations)(classes, ({ one, many }) => ({
  school: one(schools, { fields: [classes.schoolId], references: [schools.id] }),
  session: one(academicSessions, {
    fields: [classes.sessionId],
    references: [academicSessions.id]
  }),
  formMaster: one(user, { fields: [classes.formMasterId], references: [user.id] }),
  enrollments: many(studentEnrollments),
  teacherAssignments: many(teacherAssignments)
}));
var studentEnrollmentsRelations = (0, import_drizzle_orm.relations)(studentEnrollments, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [studentEnrollments.studentProfileId],
    references: [studentProfiles.id]
  }),
  class: one(classes, { fields: [studentEnrollments.classId], references: [classes.id] }),
  session: one(academicSessions, {
    fields: [studentEnrollments.sessionId],
    references: [academicSessions.id]
  })
}));
var teacherAssignmentsRelations = (0, import_drizzle_orm.relations)(teacherAssignments, ({ one }) => ({
  staffProfile: one(staffProfiles, {
    fields: [teacherAssignments.staffProfileId],
    references: [staffProfiles.id]
  }),
  branch: one(branches, {
    fields: [teacherAssignments.branchId],
    references: [branches.id]
  }),
  school: one(schools, {
    fields: [teacherAssignments.schoolId],
    references: [schools.id]
  }),
  class: one(classes, { fields: [teacherAssignments.classId], references: [classes.id] }),
  subject: one(subjects, {
    fields: [teacherAssignments.subjectId],
    references: [subjects.id]
  })
}));
var examsRelations = (0, import_drizzle_orm.relations)(exams, ({ one, many }) => ({
  branch: one(branches, { fields: [exams.branchId], references: [branches.id] }),
  school: one(schools, { fields: [exams.schoolId], references: [schools.id] }),
  session: one(academicSessions, {
    fields: [exams.sessionId],
    references: [academicSessions.id]
  }),
  term: one(terms, { fields: [exams.termId], references: [terms.id] }),
  creator: one(user, { fields: [exams.createdBy], references: [user.id] }),
  targetClasses: many(examTargetClasses),
  sections: many(examSections),
  questionLinks: many(examQuestionLinks),
  snapshots: many(examQuestionSnapshots),
  attempts: many(examAttempts)
}));
var examSectionsRelations = (0, import_drizzle_orm.relations)(examSections, ({ one, many }) => ({
  exam: one(exams, { fields: [examSections.examId], references: [exams.id] }),
  subject: one(subjects, { fields: [examSections.subjectId], references: [subjects.id] }),
  snapshots: many(examQuestionSnapshots)
}));
var examAttemptsRelations = (0, import_drizzle_orm.relations)(examAttempts, ({ one, many }) => ({
  exam: one(exams, { fields: [examAttempts.examId], references: [exams.id] }),
  studentProfile: one(studentProfiles, {
    fields: [examAttempts.studentProfileId],
    references: [studentProfiles.id]
  }),
  answers: many(attemptAnswers),
  proctoringEvents: many(proctoringEvents),
  subjectScores: many(attemptSubjectScores)
}));
var attemptAnswersRelations = (0, import_drizzle_orm.relations)(attemptAnswers, ({ one }) => ({
  attempt: one(examAttempts, {
    fields: [attemptAnswers.attemptId],
    references: [examAttempts.id]
  }),
  snapshotQuestion: one(examQuestionSnapshots, {
    fields: [attemptAnswers.snapshotQuestionId],
    references: [examQuestionSnapshots.id]
  })
}));
var questionBankItemsRelations = (0, import_drizzle_orm.relations)(questionBankItems, ({ one }) => ({
  subject: one(subjects, {
    fields: [questionBankItems.subjectId],
    references: [subjects.id]
  }),
  creator: one(user, { fields: [questionBankItems.createdBy], references: [user.id] })
}));

// src/db/index.ts
import_serverless.neonConfig.webSocketConstructor = import_ws.default;
var pool = new import_serverless.Pool({ connectionString: Env.DATABASE_URL });
var db = (0, import_neon_serverless.drizzle)(pool, { schema: schema_exports });

// src/config/resend.config.ts
var import_resend = require("resend");

// src/utils/logger.ts
var import_winston = __toESM(require("winston"));
var { colorize, combine, errors, json, printf, timestamp: timestamp7 } = import_winston.default.format;
var SENSITIVE_KEY_PATTERN = /pass(word)?|secret|token|cookie|authorization|accesspin|pinhash|otp|backupcode|apikey|api_key|phone|guardian/i;
var redactSensitiveValue = (value, depth = 0) => {
  if (depth > 8 || value === null || value === void 0) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        out[k] = "[REDACTED]";
      } else {
        out[k] = redactSensitiveValue(v, depth + 1);
      }
    }
    return out;
  }
  return value;
};
var redactFormat = import_winston.default.format((info) => {
  for (const key of Object.keys(info)) {
    if (key === "level" || key === "message" || key === "timestamp") continue;
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      info[key] = "[REDACTED]";
    } else {
      info[key] = redactSensitiveValue(info[key]);
    }
  }
  return info;
});
var developmentFormat = combine(
  redactFormat(),
  colorize({ all: true }),
  timestamp7({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, stack, timestamp: loggedAt, ...meta }) => {
    const metadata = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${loggedAt} [${level}]: ${String(message)}${stack ? ` ${stack}` : ""}${metadata}`;
  })
);
var logger = import_winston.default.createLogger({
  level: Env.LOG_LEVEL,
  format: Env.NODE_ENV === "production" ? combine(redactFormat(), timestamp7(), errors({ stack: true }), json()) : developmentFormat,
  transports: [new import_winston.default.transports.Console()],
  silent: Env.NODE_ENV === "test"
});

// src/config/resend.config.ts
var resendClient = Env.RESEND_API_KEY ? new import_resend.Resend(Env.RESEND_API_KEY) : null;
if (!resendClient && Env.NODE_ENV !== "test") {
  logger.warn("Resend API key is not configured; emails will be logged in development.");
}

// src/services/email.service.ts
var sendEmail = async (input) => {
  if (!resendClient) {
    logger.info("Dev email dispatch (Resend not configured)", {
      to: input.to,
      subject: input.subject
    });
    return;
  }
  const { error } = await resendClient.emails.send({
    from: Env.RESEND_FROM_EMAIL,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text
  });
  if (error) {
    logger.error("Failed to send email via Resend", {
      to: input.to,
      subject: input.subject,
      error: error.message
    });
    throw new Error(`Email delivery failed: ${error.message}`);
  }
};
var emailService = {
  async sendAccountProvisionedEmail(params) {
    const loginUrl = params.loginUrl || `${Env.APP_FRONTEND_URL}/signin`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2>Welcome to Examinify</h2>
        <p>Hello ${params.name},</p>
        <p>An administrator has provisioned your <strong>${params.role.replace("_", " ")}</strong> account on Examinify.</p>
        <p><strong>Username:</strong> <code>${params.username}</code></p>
        ${params.temporaryPassword ? `<p><strong>Temporary Password:</strong> <code>${params.temporaryPassword}</code><br/>You will be prompted to change this password on first sign-in.</p>` : ""}
        <p><a href="${loginUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Sign in to Examinify</a></p>
      </div>
    `;
    await sendEmail({
      to: params.to,
      subject: "Your Examinify Account Has Been Created",
      html,
      text: `Welcome to Examinify. Username: ${params.username}. Sign in at ${loginUrl}`
    });
  },
  async sendPasswordResetEmail(params) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2>Reset Your Examinify Password</h2>
        <p>Hello ${params.name},</p>
        <p>Click the link below to set a new password. This link expires shortly.</p>
        <p><a href="${params.resetUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
        <p>If you did not request a password reset, you can safely ignore this message.</p>
      </div>
    `;
    await sendEmail({
      to: params.to,
      subject: "Examinify Password Reset Request",
      html,
      text: `Reset your Examinify password using this link: ${params.resetUrl}`
    });
  },
  async sendExamPublishedNotification(params) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
        <h2>New CBT Exam Scheduled</h2>
        <p>Hello ${params.studentName},</p>
        <p><strong>${params.examTitle}</strong> has been published to your class.${params.scheduledAt ? ` Scheduled for: <strong>${params.scheduledAt}</strong>.` : ""}</p>
        <p>Log in to your Examinify student dashboard to view instructions.</p>
      </div>
    `;
    await sendEmail({
      to: params.to,
      subject: `Exam Scheduled: ${params.examTitle}`,
      html
    });
  }
};

// src/config/auth.config.ts
var auth = (0, import_better_auth.betterAuth)({
  appName: "Examinify",
  database: (0, import_drizzle_adapter.drizzleAdapter)(db, {
    provider: "pg",
    schema: schema_exports
  }),
  secret: Env.BETTER_AUTH_SECRET,
  baseURL: Env.BETTER_AUTH_URL,
  trustedOrigins: Env.CORS_ORIGINS,
  // No Google OAuth and no public signup: accounts are provisioned strictly by admins
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    async sendResetPassword({ user: targetUser, url }) {
      await emailService.sendPasswordResetEmail({
        to: targetUser.email,
        name: targetUser.name,
        resetUrl: url
      });
    }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "student",
        input: false
      },
      status: {
        type: "string",
        required: true,
        defaultValue: "active",
        input: false
      },
      mustChangePassword: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false
      },
      primaryBranchId: {
        type: "string",
        required: false,
        input: false
      },
      primarySchoolId: {
        type: "string",
        required: false,
        input: false
      }
    }
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    // 7 days
    updateAge: 60 * 60 * 24
    // refresh daily
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: Env.NODE_ENV === "production" ? "lax" : "lax",
      secure: Env.NODE_ENV === "production"
    }
  },
  plugins: [
    (0, import_plugins.username)({
      minUsernameLength: 3,
      maxUsernameLength: 64,
      usernameValidator: (value) => /^[a-zA-Z0-9._/-]+$/.test(value)
    }),
    (0, import_plugins.twoFactor)({
      issuer: "Examinify"
    }),
    (0, import_plugins.admin)({
      defaultRole: "student",
      adminRoles: ["super_admin", "school_admin"],
      roles: {
        super_admin: import_access.adminAc,
        school_admin: import_access.adminAc,
        examiner: import_access.userAc,
        teacher: import_access.userAc,
        non_academic_staff: import_access.userAc,
        student: import_access.userAc
      }
    })
  ]
});

// src/middlewares/errorHandler.middleware.ts
var import_zod2 = require("zod");

// src/config/http-status.config.ts
var HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// src/utils/app-error.ts
var ErrorCodes = {
  ERR_INTERNAL: "ERR_INTERNAL",
  ERR_BAD_REQUEST: "ERR_BAD_REQUEST",
  ERR_UNAUTHORIZED: "ERR_UNAUTHORIZED",
  ERR_FORBIDDEN: "ERR_FORBIDDEN",
  ERR_NOT_FOUND: "ERR_NOT_FOUND",
  ERR_CONFLICT: "ERR_CONFLICT",
  ERR_VALIDATION: "ERR_VALIDATION",
  ERR_TOO_MANY_REQUESTS: "ERR_TOO_MANY_REQUESTS",
  ERR_MFA_REQUIRED: "ERR_MFA_REQUIRED",
  ERR_SESSION_LOCKED: "ERR_SESSION_LOCKED",
  ERR_EXAM_CLOSED: "ERR_EXAM_CLOSED"
};
var AppError = class extends Error {
  statusCode;
  errorCode;
  details;
  constructor(message, statusCode = HttpStatus.INTERNAL_SERVER_ERROR, errorCode = ErrorCodes.ERR_INTERNAL, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
};
var InternalServerException = class extends AppError {
  constructor(message = "Internal Server Error", details) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, ErrorCodes.ERR_INTERNAL, details);
  }
};
var NotFoundException = class extends AppError {
  constructor(message = "Resource Not Found", details) {
    super(message, HttpStatus.NOT_FOUND, ErrorCodes.ERR_NOT_FOUND, details);
  }
};
var BadRequestException = class extends AppError {
  constructor(message = "Bad Request", details) {
    super(message, HttpStatus.BAD_REQUEST, ErrorCodes.ERR_BAD_REQUEST, details);
  }
};
var UnauthorizedException = class extends AppError {
  constructor(message = "Unauthorized", details) {
    super(message, HttpStatus.UNAUTHORIZED, ErrorCodes.ERR_UNAUTHORIZED, details);
  }
};
var ForbiddenException = class extends AppError {
  constructor(message = "Forbidden", details) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.ERR_FORBIDDEN, details);
  }
};
var ConflictException = class extends AppError {
  constructor(message = "Conflict", details) {
    super(message, HttpStatus.CONFLICT, ErrorCodes.ERR_CONFLICT, details);
  }
};
var TooManyRequestsException = class extends AppError {
  constructor(message = "Too many requests. Try again later.", details) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, ErrorCodes.ERR_TOO_MANY_REQUESTS, details);
  }
};
var MfaRequiredException = class extends AppError {
  constructor(message = "Two-factor authentication enrollment is required for administrator accounts.", details) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.ERR_MFA_REQUIRED, details);
  }
};
var SessionLockedException = class extends AppError {
  constructor(message = "This exam attempt is locked to another active session. Contact your examiner or school admin to unlock it.", details) {
    super(message, HttpStatus.CONFLICT, ErrorCodes.ERR_SESSION_LOCKED, details);
  }
};
var ExamClosedException = class extends AppError {
  constructor(message = "This exam is not currently accepting submissions.", details) {
    super(message, HttpStatus.FORBIDDEN, ErrorCodes.ERR_EXAM_CLOSED, details);
  }
};

// src/middlewares/errorHandler.middleware.ts
var formatZodError = (error) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
};
var errorHandler = (error, _req, res, _next) => {
  if (error instanceof import_zod2.ZodError) {
    res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      errorCode: ErrorCodes.ERR_VALIDATION,
      message: "Validation Error",
      errors: formatZodError(error)
    });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      errorCode: error.errorCode,
      message: error.message,
      ...error.details !== void 0 ? { details: error.details } : {}
    });
    return;
  }
  logger.error("Unhandled exception occurred", {
    error: error.message,
    stack: error.stack
  });
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    success: false,
    errorCode: ErrorCodes.ERR_INTERNAL,
    message: "Internal Server Error",
    ...Env.NODE_ENV !== "production" ? { details: error.message, stack: error.stack } : {}
  });
};

// src/middlewares/rateLimiter.middleware.ts
var import_express_rate_limit = require("express-rate-limit");
var import_ratelimit = require("@upstash/ratelimit");

// src/config/redis.config.ts
var import_redis = require("@upstash/redis");
var hasUpstash = Boolean(Env.UPSTASH_REDIS_REST_URL && Env.UPSTASH_REDIS_REST_TOKEN);
var redisClient = hasUpstash ? new import_redis.Redis({
  url: Env.UPSTASH_REDIS_REST_URL,
  token: Env.UPSTASH_REDIS_REST_TOKEN
}) : null;
if (!redisClient && Env.NODE_ENV !== "test") {
  logger.warn("Upstash Redis is not configured; using in-memory store for development only.");
}
var memoryStore = /* @__PURE__ */ new Map();
var getLiveMemoryEntry = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) return void 0;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return void 0;
  }
  return entry;
};
var cacheStore = {
  async get(key) {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ?? null;
    }
    return getLiveMemoryEntry(key)?.value ?? null;
  },
  async set(key, value, ttlSeconds) {
    if (redisClient) {
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, value, { ex: ttlSeconds });
      } else {
        await redisClient.set(key, value);
      }
      return;
    }
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1e3 : null
    });
  },
  async del(key) {
    if (redisClient) {
      await redisClient.del(key);
      return;
    }
    memoryStore.delete(key);
  },
  async incrWithTtl(key, ttlSeconds) {
    if (redisClient) {
      const count = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, ttlSeconds);
      }
      return count;
    }
    const existing = getLiveMemoryEntry(key);
    const next = existing ? Number(existing.value) + 1 : 1;
    memoryStore.set(key, {
      value: String(next),
      expiresAt: existing?.expiresAt ?? Date.now() + ttlSeconds * 1e3
    });
    return next;
  },
  clearMemoryStore() {
    memoryStore.clear();
  }
};

// src/middlewares/rateLimiter.middleware.ts
var getClientIp = (req) => {
  return req.ip || req.socket.remoteAddress || "unknown";
};
var createLimiter = (config) => {
  const errorPayload = {
    success: false,
    errorCode: ErrorCodes.ERR_TOO_MANY_REQUESTS,
    message: config.message || "Too many requests. Try again later."
  };
  if (redisClient) {
    const upstashLimiter = new import_ratelimit.Ratelimit({
      redis: redisClient,
      limiter: import_ratelimit.Ratelimit.slidingWindow(config.maxRequests, config.windowDuration),
      prefix: `examinify:rl:${config.prefix}`,
      analytics: false
    });
    return async (req, res, next) => {
      try {
        const key = config.keyGenerator ? config.keyGenerator(req) : getClientIp(req);
        const result = await upstashLimiter.limit(key);
        res.setHeader("RateLimit-Limit", String(result.limit));
        res.setHeader("RateLimit-Remaining", String(result.remaining));
        res.setHeader("RateLimit-Reset", String(Math.ceil(result.reset / 1e3)));
        if (!result.success) {
          res.status(HttpStatus.TOO_MANY_REQUESTS).json(errorPayload);
          return;
        }
        next();
      } catch {
        next();
      }
    };
  }
  return (0, import_express_rate_limit.rateLimit)({
    windowMs: config.windowMs,
    limit: config.maxRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: config.keyGenerator ? (req) => config.keyGenerator(req) : void 0,
    message: errorPayload
  });
};
var apiLimiter = createLimiter({
  prefix: "api",
  maxRequests: 120,
  windowMs: 60 * 1e3,
  windowDuration: "1 m"
});
var authLimiter = createLimiter({
  prefix: "auth",
  maxRequests: 15,
  windowMs: 15 * 60 * 1e3,
  windowDuration: "15 m",
  message: "Too many authentication attempts. Please try again later."
});
var pinLimiter = createLimiter({
  prefix: "pin",
  maxRequests: 5,
  windowMs: 15 * 60 * 1e3,
  windowDuration: "15 m",
  keyGenerator: (req) => `${req.auth?.user.id ?? getClientIp(req)}:${req.params.examId ?? "global"}`,
  message: "Too many exam PIN verification attempts. Contact your examiner."
});
var submitLimiter = createLimiter({
  prefix: "submit",
  maxRequests: 15,
  windowMs: 60 * 1e3,
  windowDuration: "1 m",
  keyGenerator: (req) => req.auth?.user.id ?? getClientIp(req),
  message: "Too many exam submission requests. Please wait a moment."
});
var aiLimiter = createLimiter({
  prefix: "ai",
  maxRequests: 20,
  windowMs: 60 * 60 * 1e3,
  windowDuration: "1 h",
  keyGenerator: (req) => req.auth?.user.id ?? getClientIp(req),
  message: "AI question generation quota exceeded for this hour."
});

// src/routes/v1/index.ts
var import_express8 = require("express");

// src/routes/v1/attempts.route.ts
var import_express = require("express");

// src/config/permissions.config.ts
var PERMISSIONS = {
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
  AUDIT_READ_BRANCH: "audit:read:branch"
};
var ALL_PERMISSIONS = Object.values(PERMISSIONS);
var ROLE_PERMISSIONS = {
  super_admin: new Set(ALL_PERMISSIONS),
  school_admin: /* @__PURE__ */ new Set([
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
    PERMISSIONS.AUDIT_READ_BRANCH
  ]),
  examiner: /* @__PURE__ */ new Set([
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
    PERMISSIONS.GRADEBOOK_EXPORT
  ]),
  teacher: /* @__PURE__ */ new Set([
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
    PERMISSIONS.GRADEBOOK_EXPORT
  ]),
  non_academic_staff: /* @__PURE__ */ new Set([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.USER_READ_DIRECTORY,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR
  ]),
  student: /* @__PURE__ */ new Set([
    PERMISSIONS.INSTITUTION_READ,
    PERMISSIONS.CLASS_READ,
    PERMISSIONS.SUBJECT_READ,
    PERMISSIONS.MEDIA_UPLOAD_AVATAR,
    PERMISSIONS.EXAM_READ,
    PERMISSIONS.EXAM_TAKE,
    PERMISSIONS.GRADEBOOK_READ
  ])
};
var hasPermission = (role, permission) => {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
};
var canProvisionRole = (actorRole, targetRole) => {
  if (actorRole === "super_admin") {
    return targetRole === "school_admin";
  }
  if (actorRole === "school_admin") {
    return targetRole === "examiner" || targetRole === "teacher" || targetRole === "non_academic_staff" || targetRole === "student";
  }
  return false;
};
var ADMIN_MFA_ROLES = /* @__PURE__ */ new Set([
  "super_admin",
  "school_admin"
]);

// src/services/cbt.service.ts
var import_drizzle_orm3 = require("drizzle-orm");

// src/utils/bcrypt.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var hashValue = async (value, saltRounds = 10) => {
  return import_bcryptjs.default.hash(value, saltRounds);
};
var compareValue = async (value, hashedValue) => {
  return import_bcryptjs.default.compare(value, hashedValue);
};

// src/utils/grading.util.ts
var computeWaecGrade = (percentage) => {
  const clamped = Math.max(0, Math.min(100, Number(percentage.toFixed(2))));
  if (clamped >= 75) {
    return { gradeLetter: "A1", remarks: "Excellent", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 70) {
    return { gradeLetter: "B2", remarks: "Very Good", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 65) {
    return { gradeLetter: "B3", remarks: "Good", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 60) {
    return { gradeLetter: "C4", remarks: "Credit", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 55) {
    return { gradeLetter: "C5", remarks: "Credit", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 50) {
    return { gradeLetter: "C6", remarks: "Credit", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 45) {
    return { gradeLetter: "D7", remarks: "Pass", isPassed: false, isAtRisk: true };
  }
  if (clamped >= 40) {
    return { gradeLetter: "E8", remarks: "Pass", isPassed: false, isAtRisk: true };
  }
  return { gradeLetter: "F9", remarks: "Fail", isPassed: false, isAtRisk: true };
};
var computeGradebookTotals = (input) => {
  const totalCaScore = Number(
    (input.ca1Score + input.ca2Score + input.ca3Score + input.ca4Score).toFixed(2)
  );
  const grandTotal = Number((totalCaScore + input.terminalExamScore).toFixed(2));
  const waec = computeWaecGrade(grandTotal);
  return {
    totalCaScore,
    grandTotal,
    gradeLetter: waec.gradeLetter,
    remarks: waec.remarks,
    isAtRisk: waec.isAtRisk
  };
};
var normalizeTextAnswer = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
var autoGradeObjectiveAnswer = (params) => {
  if (params.type === "theory") {
    return {
      isCorrect: null,
      awardedPoints: null,
      requiresManualGrading: true
    };
  }
  if (params.type === "mcq") {
    const isCorrect2 = Boolean(params.selectedOptionId) && Boolean(params.correctOptionId) && params.selectedOptionId === params.correctOptionId;
    return {
      isCorrect: isCorrect2,
      awardedPoints: isCorrect2 ? params.points : 0,
      requiresManualGrading: false
    };
  }
  if (!params.textResponse || !params.textResponse.trim()) {
    return { isCorrect: false, awardedPoints: 0, requiresManualGrading: false };
  }
  const candidate = normalizeTextAnswer(params.textResponse);
  const acceptable = /* @__PURE__ */ new Set();
  if (params.shortAnswer) acceptable.add(normalizeTextAnswer(params.shortAnswer));
  if (params.acceptedAnswers) {
    for (const ans of params.acceptedAnswers) {
      if (ans) acceptable.add(normalizeTextAnswer(ans));
    }
  }
  const isCorrect = acceptable.has(candidate);
  return {
    isCorrect,
    awardedPoints: isCorrect ? params.points : 0,
    requiresManualGrading: false
  };
};
var computeRubricWeightedPoints = (maxPoints, rubrics, breakdown) => {
  if (!rubrics.length || !breakdown.length) {
    return 0;
  }
  const scoreMap = new Map(breakdown.map((entry) => [entry.criterionId, entry.score]));
  let totalWeight = 0;
  let weightedPercent = 0;
  for (const rubric of rubrics) {
    const score = Math.max(0, Math.min(100, scoreMap.get(rubric.id) ?? 0));
    weightedPercent += score * rubric.weight;
    totalWeight += rubric.weight;
  }
  if (totalWeight <= 0) return 0;
  const normalizedRatio = weightedPercent / (totalWeight * 100);
  return Number((maxPoints * normalizedRatio).toFixed(2));
};

// src/utils/cbt-sanitizer.util.ts
var sanitizeQuestionForActiveAttempt = (question, optionOrder) => {
  let orderedOptions = question.options ? question.options.map((opt) => ({
    id: opt.id,
    label: opt.label,
    text: opt.text
  })) : null;
  if (orderedOptions && optionOrder && optionOrder.length > 0) {
    const byId = new Map(orderedOptions.map((o) => [o.id, o]));
    const reordered = [];
    for (const id of optionOrder) {
      const match = byId.get(id);
      if (match) reordered.push(match);
    }
    if (reordered.length === orderedOptions.length) {
      orderedOptions = reordered;
    }
  }
  return {
    id: question.id,
    sectionId: question.sectionId,
    subjectId: question.subjectId,
    questionNumber: question.questionNumber,
    type: question.type,
    prompt: question.prompt,
    contextSnippet: question.contextSnippet,
    imageUrl: question.imageUrl,
    imageCaption: question.imageCaption,
    options: orderedOptions,
    points: Number(question.points)
  };
};
var shuffleArray = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// src/services/audit.service.ts
var auditService = {
  async log(input) {
    try {
      await db.insert(auditLogs).values({
        actorUserId: input.actorUserId ?? input.req?.auth?.user.id ?? null,
        actorRole: input.actorRole ?? input.req?.auth?.user.role ?? null,
        branchId: input.branchId ?? input.req?.auth?.user.primaryBranchId ?? null,
        schoolId: input.schoolId ?? input.req?.auth?.user.primarySchoolId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
        ipAddress: input.req?.ip ?? null,
        userAgent: input.req?.get("user-agent") ?? null
      });
    } catch (error) {
      logger.error("Failed to persist audit log", {
        action: input.action,
        entityType: input.entityType,
        error: error.message
      });
    }
  }
};

// src/services/scope.service.ts
var import_drizzle_orm2 = require("drizzle-orm");
var scopeService = {
  /**
   * Verifies that the actor can operate within the requested branch/school scope.
   * super_admin has institution-wide access.
   */
  assertBranchSchoolScope(actor, target) {
    if (actor.role === "super_admin") return;
    if (target.branchId && actor.primaryBranchId && target.branchId !== actor.primaryBranchId) {
      throw new ForbiddenException("Access denied: resource belongs to another campus branch.");
    }
    if (target.schoolId && actor.primarySchoolId && target.schoolId !== actor.primarySchoolId) {
      throw new ForbiddenException("Access denied: resource belongs to another school level.");
    }
  },
  /**
   * Resolves a school and confirms actor can access it.
   */
  async assertSchoolAccess(actor, schoolId) {
    const [school] = await db.select().from(schools).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(schools.id, schoolId), (0, import_drizzle_orm2.isNull)(schools.deletedAt))).limit(1);
    if (!school) {
      throw new NotFoundException("School not found.");
    }
    this.assertBranchSchoolScope(actor, { branchId: school.branchId, schoolId: school.id });
    return school;
  },
  /**
   * Verifies that a teacher is assigned to teach a specific class (and optional subject).
   * Supports multi-branch teacher assignments and Primary self-contained classes (isAllClassSubjects).
   */
  async assertTeacherClassSubjectAccess(actor, classId, subjectId) {
    if (actor.role === "super_admin") return;
    const [targetClass] = await db.select({
      id: classes.id,
      schoolId: classes.schoolId,
      branchId: schools.branchId
    }).from(classes).innerJoin(schools, (0, import_drizzle_orm2.eq)(classes.schoolId, schools.id)).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(classes.id, classId), (0, import_drizzle_orm2.isNull)(classes.deletedAt))).limit(1);
    if (!targetClass) {
      throw new NotFoundException("Class not found.");
    }
    if (actor.role === "school_admin" || actor.role === "examiner") {
      this.assertBranchSchoolScope(actor, {
        branchId: targetClass.branchId,
        schoolId: targetClass.schoolId
      });
      return;
    }
    if (actor.role !== "teacher") {
      throw new ForbiddenException("Access denied for this class.");
    }
    const [staff] = await db.select().from(staffProfiles).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(staffProfiles.userId, actor.id), (0, import_drizzle_orm2.isNull)(staffProfiles.deletedAt))).limit(1);
    if (!staff) {
      throw new ForbiddenException("Staff profile not found for teacher.");
    }
    const assignments = await db.select().from(teacherAssignments).where(
      (0, import_drizzle_orm2.and)(
        (0, import_drizzle_orm2.eq)(teacherAssignments.staffProfileId, staff.id),
        (0, import_drizzle_orm2.eq)(teacherAssignments.classId, classId)
      )
    );
    const hasAccess = assignments.some(
      (a) => a.isAllClassSubjects || !subjectId || a.subjectId === subjectId
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        "Access denied: you are not assigned to this class/subject."
      );
    }
  },
  /**
   * Fetches active class IDs for a student user.
   */
  async getStudentActiveClassIds(userId) {
    const [profile] = await db.select().from(studentProfiles).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(studentProfiles.userId, userId), (0, import_drizzle_orm2.isNull)(studentProfiles.deletedAt))).limit(1);
    if (!profile) {
      throw new NotFoundException("Student profile not found.");
    }
    const enrollments = await db.select({ classId: studentEnrollments.classId }).from(studentEnrollments).where(
      (0, import_drizzle_orm2.and)(
        (0, import_drizzle_orm2.eq)(studentEnrollments.studentProfileId, profile.id),
        (0, import_drizzle_orm2.eq)(studentEnrollments.isActive, true)
      )
    );
    return {
      studentProfileId: profile.id,
      classIds: enrollments.map((e) => e.classId)
    };
  }
};

// src/realtime/ws.server.ts
var import_ws2 = require("ws");
var import_node = require("better-auth/node");
var RealtimeGateway = class {
  wss = null;
  clients = /* @__PURE__ */ new Map();
  examRooms = /* @__PURE__ */ new Map();
  clockTimer = null;
  init(server2) {
    this.wss = new import_ws2.WebSocketServer({ noServer: true });
    server2.on("upgrade", async (req, socket, head) => {
      try {
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        if (url.pathname !== "/ws") {
          socket.destroy();
          return;
        }
        const sessionData = await auth.api.getSession({
          headers: (0, import_node.fromNodeHeaders)(req.headers)
        });
        if (!sessionData?.user) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const examId = url.searchParams.get("examId");
        this.wss.handleUpgrade(req, socket, head, (ws2) => {
          const meta = {
            userId: sessionData.user.id,
            role: String(sessionData.user.role ?? "student"),
            examId
          };
          this.registerClient(ws2, meta);
          this.wss.emit("connection", ws2, req);
        });
      } catch (error) {
        logger.error("WebSocket upgrade failed", { error: error.message });
        socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
        socket.destroy();
      }
    });
    this.clockTimer = setInterval(() => {
      const payload = JSON.stringify({
        type: "timer:sync",
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
      for (const ws2 of this.clients.keys()) {
        if (ws2.readyState === import_ws2.WebSocket.OPEN) {
          ws2.send(payload);
        }
      }
    }, 3e4);
    this.clockTimer.unref();
  }
  registerClient(ws2, meta) {
    this.clients.set(ws2, meta);
    if (meta.examId) {
      let room = this.examRooms.get(meta.examId);
      if (!room) {
        room = /* @__PURE__ */ new Set();
        this.examRooms.set(meta.examId, room);
      }
      room.add(ws2);
    }
    ws2.send(
      JSON.stringify({
        type: "connected",
        serverTime: (/* @__PURE__ */ new Date()).toISOString(),
        examId: meta.examId
      })
    );
    ws2.on("close", () => {
      this.clients.delete(ws2);
      if (meta.examId) {
        const room = this.examRooms.get(meta.examId);
        if (room) {
          room.delete(ws2);
          if (room.size === 0) {
            this.examRooms.delete(meta.examId);
          }
        }
      }
    });
  }
  broadcastToExamMonitors(examId, event) {
    const room = this.examRooms.get(examId);
    if (!room) return;
    const payload = JSON.stringify({ ...event, serverTime: (/* @__PURE__ */ new Date()).toISOString() });
    for (const ws2 of room) {
      const meta = this.clients.get(ws2);
      if (!meta || meta.role === "student") continue;
      if (ws2.readyState === import_ws2.WebSocket.OPEN) {
        ws2.send(payload);
      }
    }
  }
  notifyStudentInExam(examId, userId, event) {
    const room = this.examRooms.get(examId);
    if (!room) return;
    const payload = JSON.stringify({ ...event, serverTime: (/* @__PURE__ */ new Date()).toISOString() });
    for (const ws2 of room) {
      const meta = this.clients.get(ws2);
      if (meta?.userId === userId && ws2.readyState === import_ws2.WebSocket.OPEN) {
        ws2.send(payload);
      }
    }
  }
  async close() {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
    if (!this.wss) return;
    for (const ws2 of this.clients.keys()) {
      ws2.close(1001, "Server shutting down");
    }
    this.clients.clear();
    this.examRooms.clear();
    await new Promise((resolve) => {
      this.wss.close(() => resolve());
    });
    this.wss = null;
  }
};
var realtimeGateway = new RealtimeGateway();

// src/services/cbt.service.ts
var SUBMISSION_GRACE_MS = 1e4;
var attemptLockKey = (attemptId) => `examinify:attempt_lock:${attemptId}`;
var cbtService = {
  async startOrResumeAttempt(authCtx, examId, input, req) {
    const actor = authCtx.user;
    const sessionId = authCtx.session.id;
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(exams.id, examId), (0, import_drizzle_orm3.isNull)(exams.deletedAt))).limit(1);
    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }
    if (exam.status !== "live") {
      throw new ExamClosedException("This exam is not currently live.");
    }
    const now = /* @__PURE__ */ new Date();
    if (exam.scheduledAt && now < exam.scheduledAt) {
      throw new ExamClosedException("This exam has not started yet.");
    }
    if (exam.endsAt && now > exam.endsAt) {
      throw new ExamClosedException("The scheduled window for this exam has closed.");
    }
    const { studentProfileId, classIds } = await scopeService.getStudentActiveClassIds(actor.id);
    const targets = await db.select({ classId: examTargetClasses.classId }).from(examTargetClasses).where((0, import_drizzle_orm3.eq)(examTargetClasses.examId, examId));
    if (!targets.some((t) => classIds.includes(t.classId))) {
      throw new ForbiddenException("Your class is not enrolled for this exam.");
    }
    if (exam.accessPinHash) {
      if (!input.accessPin) {
        throw new ForbiddenException("An Exam Access PIN is required to start this exam.");
      }
      const pinValid = await compareValue(input.accessPin, exam.accessPinHash);
      if (!pinValid) {
        throw new ForbiddenException("Invalid Exam Access PIN.");
      }
    }
    const snapshots = await db.select().from(examQuestionSnapshots).where((0, import_drizzle_orm3.eq)(examQuestionSnapshots.examId, examId)).orderBy(examQuestionSnapshots.questionNumber);
    if (snapshots.length === 0) {
      throw new BadRequestException("Exam has no published question snapshots.");
    }
    const sections = await db.select().from(examSections).where((0, import_drizzle_orm3.eq)(examSections.examId, examId)).orderBy(examSections.orderIndex);
    let [attempt] = await db.select().from(examAttempts).where(
      (0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(examAttempts.examId, examId),
        (0, import_drizzle_orm3.eq)(examAttempts.studentProfileId, studentProfileId)
      )
    ).limit(1);
    if (attempt) {
      if (attempt.status !== "in_progress") {
        throw new ExamClosedException("You have already completed this exam.");
      }
      if (now.getTime() > attempt.serverExpiresAt.getTime() + SUBMISSION_GRACE_MS) {
        await this.finalizeAttempt(attempt.id, "auto_submitted");
        throw new ExamClosedException("Your exam timer has expired and your attempt was auto-submitted.");
      }
      const cachedLock = await cacheStore.get(attemptLockKey(attempt.id));
      const activeLock = cachedLock ?? attempt.lockedSessionId;
      if (activeLock && activeLock !== sessionId) {
        await db.insert(proctoringEvents).values({
          attemptId: attempt.id,
          eventType: "session_conflict",
          details: { attemptedSessionId: sessionId }
        });
        throw new SessionLockedException();
      }
      if (!attempt.lockedSessionId) {
        [attempt] = await db.update(examAttempts).set({ lockedSessionId: sessionId, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(examAttempts.id, attempt.id)).returning();
      }
    } else {
      const serverExpiresAt = new Date(now.getTime() + exam.durationMinutes * 60 * 1e3);
      const effectiveExpiresAt = exam.endsAt && exam.endsAt < serverExpiresAt ? exam.endsAt : serverExpiresAt;
      const questionOrder = exam.shuffleQuestions ? shuffleArray(snapshots.map((s) => s.id)) : snapshots.map((s) => s.id);
      const optionOrders = {};
      if (exam.shuffleOptions) {
        for (const snap of snapshots) {
          if (snap.options && snap.options.length > 0) {
            optionOrders[snap.id] = shuffleArray(snap.options.map((o) => o.id));
          }
        }
      }
      [attempt] = await db.insert(examAttempts).values({
        examId,
        studentProfileId,
        userId: actor.id,
        lockedSessionId: sessionId,
        status: "in_progress",
        questionOrder,
        optionOrders,
        startedAt: now,
        serverExpiresAt: effectiveExpiresAt,
        ipAddress: req?.ip ?? null,
        userAgent: req?.get("user-agent") ?? null
      }).returning();
      realtimeGateway.broadcastToExamMonitors(examId, {
        type: "student:joined",
        attemptId: attempt.id,
        userId: actor.id,
        studentName: actor.name
      });
    }
    const ttlSeconds = Math.max(
      60,
      Math.ceil((attempt.serverExpiresAt.getTime() - now.getTime()) / 1e3) + 120
    );
    await cacheStore.set(attemptLockKey(attempt.id), sessionId, ttlSeconds);
    const savedAnswers = await db.select({
      snapshotQuestionId: attemptAnswers.snapshotQuestionId,
      selectedOptionId: attemptAnswers.selectedOptionId,
      textResponse: attemptAnswers.textResponse,
      isFlagged: attemptAnswers.isFlagged,
      isVisited: attemptAnswers.isVisited
    }).from(attemptAnswers).where((0, import_drizzle_orm3.eq)(attemptAnswers.attemptId, attempt.id));
    const snapMap = new Map(snapshots.map((s) => [s.id, s]));
    const orderedSanitizedQuestions = (attempt.questionOrder.length > 0 ? attempt.questionOrder : snapshots.map((s) => s.id)).map((id) => snapMap.get(id)).filter((s) => Boolean(s)).map((snap) => sanitizeQuestionForActiveAttempt(snap, attempt.optionOrders[snap.id]));
    return {
      attempt: {
        id: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        startedAt: attempt.startedAt,
        serverExpiresAt: attempt.serverExpiresAt,
        serverTime: now,
        remainingSeconds: Math.max(
          0,
          Math.floor((attempt.serverExpiresAt.getTime() - now.getTime()) / 1e3)
        ),
        infractionCount: attempt.infractionCount,
        maxInfractions: exam.maxInfractions
      },
      examConfig: {
        title: exam.title,
        sessionType: exam.sessionType,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        allowCalculator: exam.allowCalculator,
        allowBackwardNavigation: exam.allowBackwardNavigation,
        strictProctoring: exam.strictProctoring,
        maxTabSwitches: exam.maxTabSwitches
      },
      sections,
      questions: orderedSanitizedQuestions,
      savedAnswers
    };
  },
  async saveAnswer(authCtx, attemptId, input) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId), (0, import_drizzle_orm3.eq)(examAttempts.userId, authCtx.user.id))).limit(1);
    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }
    if (attempt.status !== "in_progress") {
      throw new ExamClosedException("Cannot modify answers after submission.");
    }
    const cachedLock = await cacheStore.get(attemptLockKey(attempt.id));
    const activeLock = cachedLock ?? attempt.lockedSessionId;
    if (activeLock && activeLock !== authCtx.session.id) {
      throw new SessionLockedException();
    }
    const now = Date.now();
    if (now > attempt.serverExpiresAt.getTime() + SUBMISSION_GRACE_MS) {
      await this.finalizeAttempt(attempt.id, "auto_submitted");
      throw new ExamClosedException("Exam timer expired. Your attempt has been auto-submitted.");
    }
    const [snapshot] = await db.select({ id: examQuestionSnapshots.id }).from(examQuestionSnapshots).where(
      (0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(examQuestionSnapshots.id, input.snapshotQuestionId),
        (0, import_drizzle_orm3.eq)(examQuestionSnapshots.examId, attempt.examId)
      )
    ).limit(1);
    if (!snapshot) {
      throw new BadRequestException("Question does not belong to this exam.");
    }
    const [saved] = await db.insert(attemptAnswers).values({
      attemptId: attempt.id,
      snapshotQuestionId: input.snapshotQuestionId,
      selectedOptionId: input.selectedOptionId ?? null,
      textResponse: input.textResponse ?? null,
      isFlagged: input.isFlagged ?? false,
      isVisited: input.isVisited ?? true,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: [attemptAnswers.attemptId, attemptAnswers.snapshotQuestionId],
      set: {
        selectedOptionId: input.selectedOptionId ?? null,
        textResponse: input.textResponse ?? null,
        isFlagged: input.isFlagged ?? false,
        isVisited: input.isVisited ?? true,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning({
      id: attemptAnswers.id,
      snapshotQuestionId: attemptAnswers.snapshotQuestionId,
      selectedOptionId: attemptAnswers.selectedOptionId,
      textResponse: attemptAnswers.textResponse,
      isFlagged: attemptAnswers.isFlagged,
      isVisited: attemptAnswers.isVisited,
      updatedAt: attemptAnswers.updatedAt
    });
    return saved;
  },
  async recordInfraction(authCtx, attemptId, input) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId), (0, import_drizzle_orm3.eq)(examAttempts.userId, authCtx.user.id))).limit(1);
    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }
    if (attempt.status !== "in_progress") {
      return { status: attempt.status, infractionCount: attempt.infractionCount, autoSubmitted: false };
    }
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm3.eq)(exams.id, attempt.examId)).limit(1);
    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }
    await db.insert(proctoringEvents).values({
      attemptId: attempt.id,
      eventType: input.eventType,
      details: input.details
    });
    const [updated] = await db.update(examAttempts).set({
      infractionCount: import_drizzle_orm3.sql`${examAttempts.infractionCount} + 1`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(examAttempts.id, attempt.id)).returning();
    realtimeGateway.broadcastToExamMonitors(exam.id, {
      type: "proctor:infraction",
      attemptId: attempt.id,
      userId: authCtx.user.id,
      studentName: authCtx.user.name,
      eventType: input.eventType,
      infractionCount: updated.infractionCount,
      maxInfractions: exam.maxInfractions
    });
    if (exam.strictProctoring && updated.infractionCount >= exam.maxInfractions) {
      await this.finalizeAttempt(attempt.id, "flagged");
      return {
        status: "flagged",
        infractionCount: updated.infractionCount,
        maxInfractions: exam.maxInfractions,
        autoSubmitted: true
      };
    }
    return {
      status: updated.status,
      infractionCount: updated.infractionCount,
      maxInfractions: exam.maxInfractions,
      autoSubmitted: false
    };
  },
  async submitAttempt(authCtx, attemptId) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId), (0, import_drizzle_orm3.eq)(examAttempts.userId, authCtx.user.id))).limit(1);
    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }
    if (attempt.status !== "in_progress") {
      return this.getStudentResultView(attempt.id);
    }
    const cachedLock = await cacheStore.get(attemptLockKey(attempt.id));
    const activeLock = cachedLock ?? attempt.lockedSessionId;
    if (activeLock && activeLock !== authCtx.session.id) {
      throw new SessionLockedException();
    }
    await this.finalizeAttempt(attempt.id, "submitted");
    return this.getStudentResultView(attempt.id);
  },
  async finalizeAttempt(attemptId, targetStatus) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId)).limit(1);
    if (!attempt || attempt.status !== "in_progress") {
      return attempt;
    }
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm3.eq)(exams.id, attempt.examId)).limit(1);
    const snapshots = await db.select().from(examQuestionSnapshots).where((0, import_drizzle_orm3.eq)(examQuestionSnapshots.examId, attempt.examId));
    const answers = await db.select().from(attemptAnswers).where((0, import_drizzle_orm3.eq)(attemptAnswers.attemptId, attempt.id));
    const answerMap = new Map(answers.map((a) => [a.snapshotQuestionId, a]));
    let totalAwarded = 0;
    let totalMax = 0;
    let hasTheory = false;
    const subjectBuckets = /* @__PURE__ */ new Map();
    for (const snap of snapshots) {
      const points = Number(snap.points);
      totalMax += points;
      const bucket = subjectBuckets.get(snap.subjectId) ?? {
        total: 0,
        attempted: 0,
        correct: 0,
        rawScore: 0,
        maxScore: 0
      };
      bucket.total += 1;
      bucket.maxScore += points;
      const ans = answerMap.get(snap.id);
      const isAttempted = Boolean(ans && (ans.selectedOptionId || ans.textResponse?.trim()));
      if (isAttempted) bucket.attempted += 1;
      const graded = autoGradeObjectiveAnswer({
        type: snap.type,
        points,
        correctOptionId: snap.correctOptionId,
        shortAnswer: snap.shortAnswer,
        acceptedAnswers: snap.acceptedAnswers,
        selectedOptionId: ans?.selectedOptionId,
        textResponse: ans?.textResponse
      });
      if (graded.requiresManualGrading) {
        hasTheory = true;
      } else {
        const awarded = graded.awardedPoints ?? 0;
        totalAwarded += awarded;
        bucket.rawScore += awarded;
        if (graded.isCorrect) bucket.correct += 1;
        if (ans) {
          await db.update(attemptAnswers).set({
            isCorrect: graded.isCorrect,
            awardedPoints: awarded.toFixed(2),
            updatedAt: /* @__PURE__ */ new Date()
          }).where((0, import_drizzle_orm3.eq)(attemptAnswers.id, ans.id));
        }
      }
      subjectBuckets.set(snap.subjectId, bucket);
    }
    const percentage = totalMax > 0 ? Number((totalAwarded / totalMax * 100).toFixed(2)) : 0;
    const waec = computeWaecGrade(percentage);
    const passingScore = exam ? Number(exam.passingScore) : 50;
    const finalStatus = targetStatus === "flagged" ? "flagged" : hasTheory ? targetStatus : "graded";
    const [updatedAttempt] = await db.update(examAttempts).set({
      status: finalStatus,
      submittedAt: /* @__PURE__ */ new Date(),
      lockedSessionId: null,
      aggregateScore: totalAwarded.toFixed(2),
      maxPossibleScore: totalMax.toFixed(2),
      aggregatePercentage: percentage.toFixed(2),
      gradeLetter: waec.gradeLetter,
      performanceRemark: waec.remarks,
      isPassed: percentage >= passingScore,
      resultsReleased: Boolean(exam?.autoPublishResults && !hasTheory),
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm3.eq)(examAttempts.id, attempt.id)).returning();
    for (const [subjectId, bucket] of subjectBuckets.entries()) {
      const subPct = bucket.maxScore > 0 ? Number((bucket.rawScore / bucket.maxScore * 100).toFixed(2)) : 0;
      const subGrade = computeWaecGrade(subPct);
      await db.insert(attemptSubjectScores).values({
        attemptId: attempt.id,
        subjectId,
        totalQuestions: bucket.total,
        attemptedQuestions: bucket.attempted,
        correctAnswers: bucket.correct,
        rawScore: bucket.rawScore.toFixed(2),
        maxScore: bucket.maxScore.toFixed(2),
        percentage: subPct.toFixed(2),
        gradeLetter: subGrade.gradeLetter
      }).onConflictDoUpdate({
        target: [attemptSubjectScores.attemptId, attemptSubjectScores.subjectId],
        set: {
          attemptedQuestions: bucket.attempted,
          correctAnswers: bucket.correct,
          rawScore: bucket.rawScore.toFixed(2),
          percentage: subPct.toFixed(2),
          gradeLetter: subGrade.gradeLetter
        }
      });
    }
    await cacheStore.del(attemptLockKey(attempt.id));
    realtimeGateway.broadcastToExamMonitors(attempt.examId, {
      type: "student:submitted",
      attemptId: attempt.id,
      userId: attempt.userId,
      status: updatedAttempt.status
    });
    return updatedAttempt;
  },
  async getStudentResultView(attemptId) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId)).limit(1);
    if (!attempt) {
      throw new NotFoundException("Attempt not found.");
    }
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm3.eq)(exams.id, attempt.examId)).limit(1);
    if (!attempt.resultsReleased) {
      return {
        attemptId: attempt.id,
        examId: attempt.examId,
        status: attempt.status,
        submittedAt: attempt.submittedAt,
        resultsReleased: false,
        message: "Submission recorded. Results will be visible once published by your examiner."
      };
    }
    const subjectScores = await db.select().from(attemptSubjectScores).where((0, import_drizzle_orm3.eq)(attemptSubjectScores.attemptId, attempt.id));
    return {
      attemptId: attempt.id,
      examId: attempt.examId,
      examTitle: exam?.title,
      status: attempt.status,
      submittedAt: attempt.submittedAt,
      resultsReleased: true,
      aggregateScore: Number(attempt.aggregateScore ?? 0),
      maxPossibleScore: Number(attempt.maxPossibleScore ?? 0),
      aggregatePercentage: Number(attempt.aggregatePercentage ?? 0),
      gradeLetter: attempt.gradeLetter,
      performanceRemark: attempt.performanceRemark,
      isPassed: attempt.isPassed,
      subjects: subjectScores
    };
  },
  async listMyResults(userId) {
    const attempts = await db.select().from(examAttempts).where(
      (0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(examAttempts.userId, userId),
        (0, import_drizzle_orm3.inArray)(examAttempts.status, ["submitted", "auto_submitted", "flagged", "graded"])
      )
    );
    return Promise.all(attempts.map((a) => this.getStudentResultView(a.id)));
  },
  async forceSubmitAttempt(authCtx, attemptId, reason, req) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId)).limit(1);
    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }
    await db.insert(proctoringEvents).values({
      attemptId: attempt.id,
      eventType: "force_submit",
      details: { actorId: authCtx.user.id, reason: reason ?? "Forced by examiner" }
    });
    const finalized = await this.finalizeAttempt(attempt.id, "flagged");
    realtimeGateway.notifyStudentInExam(attempt.examId, attempt.userId, {
      type: "attempt:force_submitted",
      attemptId: attempt.id,
      reason: reason ?? "Your exam has been concluded by the examiner."
    });
    await auditService.log({
      action: "attempt.force_submit",
      entityType: "exam_attempt",
      entityId: attempt.id,
      metadata: { examId: attempt.examId, studentUserId: attempt.userId, reason },
      req
    });
    return finalized;
  },
  async unlockAttemptSession(authCtx, attemptId, req) {
    const [attempt] = await db.select().from(examAttempts).where((0, import_drizzle_orm3.eq)(examAttempts.id, attemptId)).limit(1);
    if (!attempt) {
      throw new NotFoundException("Exam attempt not found.");
    }
    await db.update(examAttempts).set({ lockedSessionId: null, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm3.eq)(examAttempts.id, attempt.id));
    await cacheStore.del(attemptLockKey(attempt.id));
    await auditService.log({
      action: "attempt.unlock_session",
      entityType: "exam_attempt",
      entityId: attempt.id,
      metadata: { examId: attempt.examId, unlockedBy: authCtx.user.id },
      req
    });
    return { unlocked: true, attemptId: attempt.id };
  },
  async sweepExpiredAttempts() {
    const cutoff = new Date(Date.now() - SUBMISSION_GRACE_MS);
    const expired = await db.select({ id: examAttempts.id }).from(examAttempts).where(
      (0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(examAttempts.status, "in_progress"),
        (0, import_drizzle_orm3.lte)(examAttempts.serverExpiresAt, cutoff)
      )
    ).limit(50);
    for (const row of expired) {
      await this.finalizeAttempt(row.id, "auto_submitted");
    }
    return expired.length;
  }
};

// src/validators/cbt.validator.ts
var import_zod3 = require("zod");
var startAttemptSchema = import_zod3.z.object({
  accessPin: import_zod3.z.string().trim().min(1).max(32).optional()
});
var saveAnswerSchema = import_zod3.z.object({
  snapshotQuestionId: import_zod3.z.string().uuid(),
  selectedOptionId: import_zod3.z.string().trim().max(32).nullable().optional(),
  textResponse: import_zod3.z.string().max(15e3).nullable().optional(),
  isFlagged: import_zod3.z.boolean().optional(),
  isVisited: import_zod3.z.boolean().optional().default(true)
});
var recordInfractionSchema = import_zod3.z.object({
  eventType: import_zod3.z.enum([
    "tab_switch",
    "fullscreen_exit",
    "window_blur",
    "copy_attempt"
  ]),
  details: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.unknown()).optional().default({})
});
var forceSubmitSchema = import_zod3.z.object({
  reason: import_zod3.z.string().trim().min(3).max(300).optional()
});

// src/controllers/cbt.controller.ts
var cbtController = {
  async startAttempt(req, res) {
    const payload = startAttemptSchema.parse(req.body ?? {});
    const data = await cbtService.startOrResumeAttempt(
      req.auth,
      String(req.params.examId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async saveAnswer(req, res) {
    const payload = saveAnswerSchema.parse(req.body);
    const data = await cbtService.saveAnswer(
      req.auth,
      String(req.params.attemptId),
      payload
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async recordInfraction(req, res) {
    const payload = recordInfractionSchema.parse(req.body);
    const data = await cbtService.recordInfraction(
      req.auth,
      String(req.params.attemptId),
      payload
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async submitAttempt(req, res) {
    const data = await cbtService.submitAttempt(
      req.auth,
      String(req.params.attemptId)
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async listMyResults(req, res) {
    const data = await cbtService.listMyResults(req.auth.user.id);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async forceSubmit(req, res) {
    const payload = forceSubmitSchema.parse(req.body ?? {});
    const data = await cbtService.forceSubmitAttempt(
      req.auth,
      String(req.params.attemptId),
      payload.reason,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async unlockSession(req, res) {
    const data = await cbtService.unlockAttemptSession(
      req.auth,
      String(req.params.attemptId),
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  }
};

// src/services/exam.service.ts
var import_drizzle_orm4 = require("drizzle-orm");
var requiresApprovalGate = (assessmentType, sessionType) => {
  return assessmentType === "Exam" || sessionType === "term_exam" || sessionType === "national_jamb_mock";
};
var examService = {
  async list(actor, filters) {
    const conditions = [(0, import_drizzle_orm4.isNull)(exams.deletedAt)];
    if (filters.status) conditions.push((0, import_drizzle_orm4.eq)(exams.status, filters.status));
    if (filters.termId) conditions.push((0, import_drizzle_orm4.eq)(exams.termId, filters.termId));
    if (actor.role === "student") {
      const { classIds } = await scopeService.getStudentActiveClassIds(actor.id);
      if (classIds.length === 0) return [];
      const targeted = await db.select({ examId: examTargetClasses.examId }).from(examTargetClasses).where((0, import_drizzle_orm4.inArray)(examTargetClasses.classId, classIds));
      const examIds = [...new Set(targeted.map((t) => t.examId))];
      if (examIds.length === 0) return [];
      conditions.push((0, import_drizzle_orm4.inArray)(exams.id, examIds));
      conditions.push((0, import_drizzle_orm4.inArray)(exams.status, ["scheduled", "live", "completed", "published"]));
    } else if (actor.role !== "super_admin" && actor.primaryBranchId) {
      conditions.push(
        (0, import_drizzle_orm4.or)((0, import_drizzle_orm4.eq)(exams.branchId, actor.primaryBranchId), (0, import_drizzle_orm4.isNull)(exams.branchId))
      );
    }
    const rows = await db.select({
      id: exams.id,
      title: exams.title,
      branchId: exams.branchId,
      schoolId: exams.schoolId,
      schoolLevel: exams.schoolLevel,
      sessionId: exams.sessionId,
      termId: exams.termId,
      sessionType: exams.sessionType,
      assessmentType: exams.assessmentType,
      status: exams.status,
      durationMinutes: exams.durationMinutes,
      passingScore: exams.passingScore,
      scheduledAt: exams.scheduledAt,
      endsAt: exams.endsAt,
      hasAccessPin: exams.accessPinHash,
      allowCalculator: exams.allowCalculator,
      strictProctoring: exams.strictProctoring,
      maxInfractions: exams.maxInfractions,
      enableLiveMonitoring: exams.enableLiveMonitoring,
      createdAt: exams.createdAt
    }).from(exams).where((0, import_drizzle_orm4.and)(...conditions)).orderBy((0, import_drizzle_orm4.desc)(exams.createdAt)).limit(100);
    return rows.map(({ hasAccessPin, ...rest }) => ({
      ...rest,
      requiresAccessPin: Boolean(hasAccessPin)
    }));
  },
  async getById(actor, examId) {
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(exams.id, examId), (0, import_drizzle_orm4.isNull)(exams.deletedAt))).limit(1);
    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }
    if (actor.role === "student") {
      const { classIds } = await scopeService.getStudentActiveClassIds(actor.id);
      const targets2 = await db.select({ classId: examTargetClasses.classId }).from(examTargetClasses).where((0, import_drizzle_orm4.eq)(examTargetClasses.examId, examId));
      const isEnrolled = targets2.some((t) => classIds.includes(t.classId));
      if (!isEnrolled || exam.status === "draft" || exam.status === "pending_approval") {
        throw new ForbiddenException("You do not have access to this exam.");
      }
    } else if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId
      });
    }
    const sections = await db.select().from(examSections).where((0, import_drizzle_orm4.eq)(examSections.examId, examId)).orderBy(examSections.orderIndex);
    const targets = await db.select({ classId: examTargetClasses.classId }).from(examTargetClasses).where((0, import_drizzle_orm4.eq)(examTargetClasses.examId, examId));
    const { accessPinHash, ...safeExam } = exam;
    return {
      ...safeExam,
      requiresAccessPin: Boolean(accessPinHash),
      targetClassIds: targets.map((t) => t.classId),
      sections
    };
  },
  async create(actor, input, req) {
    const isCrossBranch = input.branchId === null;
    if (isCrossBranch && actor.role !== "super_admin" && actor.role !== "examiner") {
      throw new ForbiddenException(
        "Only Super Admins and Examiners can create cross-branch shared exams."
      );
    }
    const branchId = isCrossBranch ? null : input.branchId ?? actor.primaryBranchId ?? null;
    const schoolId = isCrossBranch ? null : input.schoolId ?? actor.primarySchoolId ?? null;
    if (actor.role === "teacher") {
      for (const classId of input.targetClassIds) {
        for (const section of input.sections) {
          await scopeService.assertTeacherClassSubjectAccess(actor, classId, section.subjectId);
        }
      }
    } else if (branchId) {
      scopeService.assertBranchSchoolScope(actor, { branchId, schoolId });
    }
    const accessPinHash = input.accessPin ? await hashValue(input.accessPin) : null;
    const created = await db.transaction(async (tx) => {
      const [newExam] = await tx.insert(exams).values({
        title: input.title,
        branchId,
        schoolId,
        schoolLevel: input.schoolLevel,
        sessionId: input.sessionId,
        termId: input.termId,
        createdBy: actor.id,
        sessionType: input.sessionType,
        assessmentType: input.assessmentType,
        status: "draft",
        instructions: input.instructions,
        durationMinutes: input.durationMinutes,
        passingScore: input.passingScore.toFixed(2),
        scheduledAt: input.scheduledAt,
        endsAt: input.endsAt,
        accessPinHash,
        allowCalculator: input.allowCalculator,
        shuffleQuestions: input.shuffleQuestions,
        shuffleOptions: input.shuffleOptions,
        allowBackwardNavigation: input.allowBackwardNavigation,
        strictProctoring: input.strictProctoring,
        maxInfractions: input.maxInfractions,
        maxTabSwitches: input.maxTabSwitches,
        autoPublishResults: input.autoPublishResults,
        showStudentFeedback: input.showStudentFeedback,
        showCorrectAnswers: input.showCorrectAnswers,
        enableLiveMonitoring: input.enableLiveMonitoring
      }).returning();
      await tx.insert(examTargetClasses).values(
        input.targetClassIds.map((classId) => ({
          examId: newExam.id,
          classId
        }))
      );
      for (let sIdx = 0; sIdx < input.sections.length; sIdx += 1) {
        const sec = input.sections[sIdx];
        const bankQuestions = await tx.select().from(questionBankItems).where(
          (0, import_drizzle_orm4.and)(
            (0, import_drizzle_orm4.inArray)(questionBankItems.id, sec.questionBankItemIds),
            (0, import_drizzle_orm4.isNull)(questionBankItems.deletedAt)
          )
        );
        if (bankQuestions.length !== sec.questionBankItemIds.length) {
          throw new BadRequestException(
            `One or more question bank items in section "${sec.title}" do not exist.`
          );
        }
        const sectionMaxScore = bankQuestions.reduce(
          (sum, q) => sum + Number(q.points),
          0
        );
        const [createdSection] = await tx.insert(examSections).values({
          examId: newExam.id,
          subjectId: sec.subjectId,
          title: sec.title,
          orderIndex: sIdx,
          totalQuestions: bankQuestions.length,
          maxScore: sectionMaxScore.toFixed(2)
        }).returning();
        await tx.insert(examQuestionLinks).values(
          sec.questionBankItemIds.map((qId, qIdx) => ({
            examId: newExam.id,
            sectionId: createdSection.id,
            questionBankItemId: qId,
            orderIndex: qIdx + 1
          }))
        );
      }
      return newExam;
    });
    await auditService.log({
      action: "exam.create",
      entityType: "exam",
      entityId: created.id,
      branchId,
      schoolId,
      metadata: {
        title: created.title,
        assessmentType: created.assessmentType,
        sessionType: created.sessionType
      },
      req
    });
    const { accessPinHash: _pin, ...safe } = created;
    return { ...safe, requiresAccessPin: Boolean(_pin) };
  },
  /**
   * Freezes linked question_bank_items into immutable exam_question_snapshots.
   */
  async freezeSnapshots(examId) {
    const existingSnapshots = await db.select({ id: examQuestionSnapshots.id }).from(examQuestionSnapshots).where((0, import_drizzle_orm4.eq)(examQuestionSnapshots.examId, examId)).limit(1);
    if (existingSnapshots.length > 0) {
      return;
    }
    const sections = await db.select().from(examSections).where((0, import_drizzle_orm4.eq)(examSections.examId, examId)).orderBy(examSections.orderIndex);
    const links = await db.select().from(examQuestionLinks).where((0, import_drizzle_orm4.eq)(examQuestionLinks.examId, examId)).orderBy(examQuestionLinks.orderIndex);
    if (links.length === 0) {
      throw new BadRequestException("Cannot publish an exam with zero linked questions.");
    }
    const bankIds = links.map((l) => l.questionBankItemId);
    const bankItems = await db.select().from(questionBankItems).where((0, import_drizzle_orm4.inArray)(questionBankItems.id, bankIds));
    const bankMap = new Map(bankItems.map((b) => [b.id, b]));
    const sectionMap = new Map(sections.map((s) => [s.id, s]));
    let globalNumber = 1;
    const snapshots = links.map((link) => {
      const bankItem = bankMap.get(link.questionBankItemId);
      const section = sectionMap.get(link.sectionId);
      if (!bankItem || !section) {
        throw new BadRequestException("Missing linked question or section during snapshot.");
      }
      return {
        examId,
        sectionId: link.sectionId,
        subjectId: section.subjectId,
        sourceQuestionId: bankItem.id,
        questionNumber: globalNumber++,
        type: bankItem.type,
        prompt: bankItem.prompt,
        contextSnippet: bankItem.contextSnippet,
        imageUrl: bankItem.imageUrl,
        imageCaption: bankItem.imageCaption,
        options: bankItem.options,
        correctOptionId: bankItem.correctOptionId,
        shortAnswer: bankItem.shortAnswer,
        acceptedAnswers: bankItem.acceptedAnswers,
        theoryAnswer: bankItem.theoryAnswer,
        rubrics: bankItem.rubrics,
        points: link.pointsOverride ?? bankItem.points,
        explanation: bankItem.explanation
      };
    });
    await db.insert(examQuestionSnapshots).values(snapshots);
  },
  /**
   * Hybrid Approval Publish Endpoint:
   * - Teachers publishing CA1-CA4 go straight to live/scheduled & freeze snapshots.
   * - Teachers publishing Terminal/Mock Exams transition to `pending_approval`.
   * - Examiners/Admins can publish/approve directly.
   */
  async publishOrSubmitForApproval(actor, examId, desiredStatus = "live", req) {
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(exams.id, examId), (0, import_drizzle_orm4.isNull)(exams.deletedAt))).limit(1);
    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }
    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId
      });
    }
    const needsApproval = requiresApprovalGate(exam.assessmentType, exam.sessionType);
    if (actor.role === "teacher" && needsApproval) {
      const [pending] = await db.update(exams).set({ status: "pending_approval", updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm4.eq)(exams.id, examId)).returning();
      await auditService.log({
        action: "exam.submit_for_approval",
        entityType: "exam",
        entityId: examId,
        branchId: exam.branchId,
        schoolId: exam.schoolId,
        metadata: { assessmentType: exam.assessmentType, sessionType: exam.sessionType },
        req
      });
      const { accessPinHash: _p2, ...safe2 } = pending;
      return { ...safe2, requiresAccessPin: Boolean(_p2) };
    }
    await this.freezeSnapshots(examId);
    const [published] = await db.update(exams).set({
      status: desiredStatus,
      approvedBy: actor.id,
      approvedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm4.eq)(exams.id, examId)).returning();
    await auditService.log({
      action: "exam.publish",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: { status: desiredStatus, assessmentType: exam.assessmentType },
      req
    });
    const { accessPinHash: _p, ...safe } = published;
    return { ...safe, requiresAccessPin: Boolean(_p) };
  },
  async approveExam(actor, examId, input, req) {
    const [exam] = await db.select().from(exams).where((0, import_drizzle_orm4.and)((0, import_drizzle_orm4.eq)(exams.id, examId), (0, import_drizzle_orm4.isNull)(exams.deletedAt))).limit(1);
    if (!exam) {
      throw new NotFoundException("Exam not found.");
    }
    if (exam.branchId) {
      scopeService.assertBranchSchoolScope(actor, {
        branchId: exam.branchId,
        schoolId: exam.schoolId
      });
    }
    await this.freezeSnapshots(examId);
    const updatePayload = {
      status: input.status,
      approvedBy: actor.id,
      approvedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (input.scheduledAt) updatePayload.scheduledAt = input.scheduledAt;
    if (input.endsAt) updatePayload.endsAt = input.endsAt;
    if (input.accessPin) updatePayload.accessPinHash = await hashValue(input.accessPin);
    const [approved] = await db.update(exams).set(updatePayload).where((0, import_drizzle_orm4.eq)(exams.id, examId)).returning();
    await auditService.log({
      action: "exam.approve",
      entityType: "exam",
      entityId: examId,
      branchId: exam.branchId,
      schoolId: exam.schoolId,
      metadata: { status: input.status, pinRotated: Boolean(input.accessPin) },
      req
    });
    const { accessPinHash: _p, ...safe } = approved;
    return { ...safe, requiresAccessPin: Boolean(_p) };
  }
};

// src/services/gradebook.service.ts
var import_drizzle_orm5 = require("drizzle-orm");
var import_papaparse = __toESM(require("papaparse"));
var gradebookService = {
  async gradeTheoryAnswer(actor, attemptId, answerId, input, req) {
    const [answer] = await db.select().from(attemptAnswers).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(attemptAnswers.id, answerId), (0, import_drizzle_orm5.eq)(attemptAnswers.attemptId, attemptId))).limit(1);
    if (!answer) {
      throw new NotFoundException("Attempt answer not found.");
    }
    const [snapshot] = await db.select().from(examQuestionSnapshots).where((0, import_drizzle_orm5.eq)(examQuestionSnapshots.id, answer.snapshotQuestionId)).limit(1);
    if (!snapshot || snapshot.type !== "theory") {
      throw new BadRequestException("Only theory answers can be manually graded here.");
    }
    const maxPoints = Number(snapshot.points);
    let awarded = input.awardedPoints;
    if (awarded === void 0 && input.rubricBreakdown && snapshot.rubrics) {
      awarded = computeRubricWeightedPoints(
        maxPoints,
        snapshot.rubrics,
        input.rubricBreakdown
      );
    }
    if (awarded === void 0) {
      throw new BadRequestException("Provide either awardedPoints or rubricBreakdown.");
    }
    if (awarded > maxPoints) {
      throw new BadRequestException(`Awarded points cannot exceed max points (${maxPoints}).`);
    }
    const [updatedAnswer] = await db.update(attemptAnswers).set({
      awardedPoints: awarded.toFixed(2),
      isCorrect: awarded >= maxPoints * 0.5,
      rubricBreakdown: input.rubricBreakdown ?? null,
      graderFeedback: input.graderFeedback ?? null,
      gradedBy: actor.id,
      gradedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm5.eq)(attemptAnswers.id, answerId)).returning();
    const allSnapshots = await db.select().from(examQuestionSnapshots).where((0, import_drizzle_orm5.eq)(examQuestionSnapshots.examId, snapshot.examId));
    const allAnswers = await db.select().from(attemptAnswers).where((0, import_drizzle_orm5.eq)(attemptAnswers.attemptId, attemptId));
    const maxPossible = allSnapshots.reduce((sum, s) => sum + Number(s.points), 0);
    const totalAwarded = allAnswers.reduce(
      (sum, a) => sum + (a.awardedPoints ? Number(a.awardedPoints) : 0),
      0
    );
    const percentage = maxPossible > 0 ? Number((totalAwarded / maxPossible * 100).toFixed(2)) : 0;
    const waec = computeWaecGrade(percentage);
    const hasPendingTheory = allSnapshots.some((s) => {
      if (s.type !== "theory") return false;
      const ans = allAnswers.find((a) => a.snapshotQuestionId === s.id);
      return !ans || ans.awardedPoints === null;
    });
    await db.update(examAttempts).set({
      aggregateScore: totalAwarded.toFixed(2),
      maxPossibleScore: maxPossible.toFixed(2),
      aggregatePercentage: percentage.toFixed(2),
      gradeLetter: waec.gradeLetter,
      performanceRemark: waec.remarks,
      isPassed: waec.isPassed,
      status: hasPendingTheory ? "submitted" : "graded",
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm5.eq)(examAttempts.id, attemptId));
    await auditService.log({
      action: "attempt.grade_theory",
      entityType: "attempt_answer",
      entityId: answerId,
      metadata: { attemptId, awardedPoints: awarded, maxPoints },
      req
    });
    return updatedAnswer;
  },
  async upsertRecord(actor, input, req) {
    await scopeService.assertTeacherClassSubjectAccess(actor, input.classId, input.subjectId);
    const computed = computeGradebookTotals({
      ca1Score: input.ca1Score,
      ca2Score: input.ca2Score,
      ca3Score: input.ca3Score,
      ca4Score: input.ca4Score,
      terminalExamScore: input.terminalExamScore
    });
    const [record] = await db.insert(gradebookRecords).values({
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
      updatedBy: actor.id
    }).onConflictDoUpdate({
      target: [
        gradebookRecords.studentProfileId,
        gradebookRecords.subjectId,
        gradebookRecords.termId
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
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    await auditService.log({
      action: input.overrideReason ? "gradebook.override" : "gradebook.upsert",
      entityType: "gradebook_record",
      entityId: record.id,
      metadata: {
        studentProfileId: input.studentProfileId,
        subjectId: input.subjectId,
        grandTotal: computed.grandTotal,
        gradeLetter: computed.gradeLetter,
        overrideReason: input.overrideReason
      },
      req
    });
    return record;
  },
  async listByClassAndTerm(actor, filters) {
    if (actor.role === "student") {
      const { studentProfileId } = await scopeService.getStudentActiveClassIds(actor.id);
      return db.select().from(gradebookRecords).where(
        (0, import_drizzle_orm5.and)(
          (0, import_drizzle_orm5.eq)(gradebookRecords.studentProfileId, studentProfileId),
          (0, import_drizzle_orm5.eq)(gradebookRecords.termId, filters.termId),
          (0, import_drizzle_orm5.eq)(gradebookRecords.isPublished, true)
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
      (0, import_drizzle_orm5.eq)(gradebookRecords.classId, filters.classId),
      (0, import_drizzle_orm5.eq)(gradebookRecords.termId, filters.termId)
    ];
    if (filters.subjectId) {
      conditions.push((0, import_drizzle_orm5.eq)(gradebookRecords.subjectId, filters.subjectId));
    }
    return db.select({
      record: gradebookRecords,
      registrationNumber: studentProfiles.registrationNumber,
      studentName: user.name
    }).from(gradebookRecords).innerJoin(
      studentProfiles,
      (0, import_drizzle_orm5.eq)(gradebookRecords.studentProfileId, studentProfiles.id)
    ).innerJoin(user, (0, import_drizzle_orm5.eq)(studentProfiles.userId, user.id)).where((0, import_drizzle_orm5.and)(...conditions)).orderBy((0, import_drizzle_orm5.desc)(gradebookRecords.grandTotal));
  },
  async exportClassCsv(actor, filters) {
    const rows = await this.listByClassAndTerm(actor, filters);
    return import_papaparse.default.unparse(
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
        atRisk: r.record.isAtRisk ? "YES" : "NO"
      }))
    );
  }
};

// src/services/question-bank.service.ts
var import_drizzle_orm6 = require("drizzle-orm");

// src/services/ai-question.service.ts
var import_genai = require("@google/genai");
var import_zod4 = require("zod");
var DAILY_TEACHER_AI_LIMIT = 50;
var generatedQuestionSchema = import_zod4.z.object({
  prompt: import_zod4.z.string().min(5),
  contextSnippet: import_zod4.z.string().optional(),
  options: import_zod4.z.array(
    import_zod4.z.object({
      id: import_zod4.z.string(),
      label: import_zod4.z.string(),
      text: import_zod4.z.string()
    })
  ).optional(),
  correctOptionId: import_zod4.z.string().optional(),
  shortAnswer: import_zod4.z.string().optional(),
  acceptedAnswers: import_zod4.z.array(import_zod4.z.string()).optional(),
  theoryAnswer: import_zod4.z.string().optional(),
  rubrics: import_zod4.z.array(
    import_zod4.z.object({
      id: import_zod4.z.string(),
      criterion: import_zod4.z.string(),
      weight: import_zod4.z.number()
    })
  ).optional(),
  points: import_zod4.z.number().min(0.5).max(100).default(1),
  explanation: import_zod4.z.string().optional(),
  tags: import_zod4.z.array(import_zod4.z.string()).default([])
});
var aiResponseSchema = import_zod4.z.object({
  questions: import_zod4.z.array(generatedQuestionSchema).min(1)
});
var aiQuestionService = {
  async generateDraftQuestions(actor, input) {
    if (!Env.GEMINI_API_KEY) {
      throw new InternalServerException(
        "AI Question Generator is not configured (GEMINI_API_KEY missing)."
      );
    }
    const dayKey = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const quotaKey = `examinify:ai_quota:${actor.id}:${dayKey}`;
    const usedCount = await cacheStore.incrWithTtl(quotaKey, 86400);
    if (usedCount > DAILY_TEACHER_AI_LIMIT) {
      throw new TooManyRequestsException(
        "Daily AI question generation quota reached. Try again tomorrow."
      );
    }
    const ai = new import_genai.GoogleGenAI({ apiKey: Env.GEMINI_API_KEY });
    const systemPrompt = [
      "You are an expert Nigerian Primary & Secondary curriculum assessment author (WAEC/NECO/JAMB standards).",
      `Generate exactly ${input.count} ${input.difficulty} ${input.questionType} questions for ${input.schoolLevel} school (${input.gradeLevel}) on subject "${input.subjectName}", topic "${input.topic}".`,
      "Return ONLY valid JSON matching this exact structure:",
      `{ "questions": [ { "prompt": "...", "options": [{"id":"A","label":"A","text":"..."},{"id":"B","label":"B","text":"..."},{"id":"C","label":"C","text":"..."},{"id":"D","label":"D","text":"..."}], "correctOptionId": "A", "shortAnswer": "...", "acceptedAnswers": ["..."], "theoryAnswer": "...", "rubrics": [{"id":"r1","criterion":"...","weight":0.5},{"id":"r2","criterion":"...","weight":0.5}], "points": 2, "explanation": "...", "tags": ["..."] } ] }`,
      "For mcq, provide 4 options (A-D) and correctOptionId. For fill_blanks, provide shortAnswer and acceptedAnswers. For theory, provide theoryAnswer and rubrics whose weights sum to 1.0."
    ].join("\n");
    const response = await ai.models.generateContent({
      model: Env.GEMINI_MODEL,
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4
      }
    });
    const rawText = response.text;
    if (!rawText) {
      throw new InternalServerException("AI model returned an empty response.");
    }
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new InternalServerException("AI model returned invalid JSON output.");
    }
    const validated = aiResponseSchema.parse(parsedJson);
    return validated.questions;
  }
};

// src/services/question-bank.service.ts
var questionBankService = {
  async list(actor, filters) {
    const conditions = [(0, import_drizzle_orm6.isNull)(questionBankItems.deletedAt)];
    if (actor.role !== "super_admin" && actor.primaryBranchId) {
      conditions.push(
        (0, import_drizzle_orm6.or)(
          (0, import_drizzle_orm6.eq)(questionBankItems.branchId, actor.primaryBranchId),
          (0, import_drizzle_orm6.isNull)(questionBankItems.branchId)
        )
      );
    }
    if (filters.subjectId) conditions.push((0, import_drizzle_orm6.eq)(questionBankItems.subjectId, filters.subjectId));
    if (filters.schoolLevel) conditions.push((0, import_drizzle_orm6.eq)(questionBankItems.schoolLevel, filters.schoolLevel));
    if (filters.difficulty) conditions.push((0, import_drizzle_orm6.eq)(questionBankItems.difficulty, filters.difficulty));
    return db.select().from(questionBankItems).where((0, import_drizzle_orm6.and)(...conditions)).orderBy((0, import_drizzle_orm6.desc)(questionBankItems.createdAt)).limit(200);
  },
  async create(actor, input, req) {
    const branchId = input.branchId === null && (actor.role === "super_admin" || actor.role === "examiner") ? null : input.branchId ?? actor.primaryBranchId ?? null;
    if (branchId) {
      scopeService.assertBranchSchoolScope(actor, { branchId });
    }
    const [created] = await db.insert(questionBankItems).values({
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
      isAiGenerated: Boolean(input.isAiGenerated)
    }).returning();
    await auditService.log({
      action: "question_bank.create",
      entityType: "question_bank_item",
      entityId: created.id,
      branchId,
      metadata: { type: created.type, isAiGenerated: created.isAiGenerated },
      req
    });
    return created;
  },
  async softDelete(actor, questionId, req) {
    const [item] = await db.select().from(questionBankItems).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(questionBankItems.id, questionId), (0, import_drizzle_orm6.isNull)(questionBankItems.deletedAt))).limit(1);
    if (!item) {
      throw new NotFoundException("Question bank item not found.");
    }
    if (item.branchId) {
      scopeService.assertBranchSchoolScope(actor, { branchId: item.branchId });
    }
    await db.update(questionBankItems).set({ deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm6.eq)(questionBankItems.id, questionId));
    await auditService.log({
      action: "question_bank.delete",
      entityType: "question_bank_item",
      entityId: questionId,
      branchId: item.branchId,
      req
    });
    return { deleted: true };
  },
  async generateWithAi(actor, input, req) {
    const drafts = await aiQuestionService.generateDraftQuestions(actor, input);
    if (!input.saveToBank) {
      await auditService.log({
        action: "question_bank.ai_generate",
        entityType: "subject",
        entityId: input.subjectId,
        metadata: { count: drafts.length, saved: false, topic: input.topic },
        req
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
          isAiGenerated: true
        },
        req
      );
      savedItems.push(saved);
    }
    return { saved: true, items: savedItems };
  }
};

// src/validators/exam.validator.ts
var import_zod5 = require("zod");
var optionSchema = import_zod5.z.object({
  id: import_zod5.z.string().trim().min(1).max(16),
  label: import_zod5.z.string().trim().min(1).max(8),
  text: import_zod5.z.string().trim().min(1).max(1e3)
});
var rubricSchema = import_zod5.z.object({
  id: import_zod5.z.string().trim().min(1).max(32),
  criterion: import_zod5.z.string().trim().min(2).max(300),
  weight: import_zod5.z.number().min(0.01).max(1)
});
var createQuestionBankSchema = import_zod5.z.object({
  subjectId: import_zod5.z.string().uuid(),
  branchId: import_zod5.z.string().uuid().nullable().optional(),
  schoolLevel: import_zod5.z.enum(["primary", "secondary"]),
  type: import_zod5.z.enum(["mcq", "fill_blanks", "theory"]),
  prompt: import_zod5.z.string().trim().min(5).max(5e3),
  contextSnippet: import_zod5.z.string().trim().max(5e3).optional(),
  imageUrl: import_zod5.z.string().url().optional(),
  imageCaption: import_zod5.z.string().trim().max(300).optional(),
  options: import_zod5.z.array(optionSchema).min(2).max(6).optional(),
  correctOptionId: import_zod5.z.string().trim().optional(),
  shortAnswer: import_zod5.z.string().trim().max(500).optional(),
  acceptedAnswers: import_zod5.z.array(import_zod5.z.string().trim().min(1)).optional(),
  theoryAnswer: import_zod5.z.string().trim().max(1e4).optional(),
  rubrics: import_zod5.z.array(rubricSchema).optional(),
  points: import_zod5.z.number().min(0.5).max(100).default(1),
  explanation: import_zod5.z.string().trim().max(3e3).optional(),
  difficulty: import_zod5.z.enum(["basic", "intermediate", "advanced"]).default("intermediate"),
  tags: import_zod5.z.array(import_zod5.z.string().trim().min(1)).default([]),
  isAiGenerated: import_zod5.z.boolean().optional().default(false)
}).superRefine((data, ctx) => {
  if (data.type === "mcq") {
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: import_zod5.z.ZodIssueCode.custom,
        path: ["options"],
        message: "MCQ questions require at least 2 options"
      });
    }
    if (!data.correctOptionId) {
      ctx.addIssue({
        code: import_zod5.z.ZodIssueCode.custom,
        path: ["correctOptionId"],
        message: "MCQ questions require a correctOptionId"
      });
    }
  }
  if (data.type === "fill_blanks" && !data.shortAnswer && (!data.acceptedAnswers || data.acceptedAnswers.length === 0)) {
    ctx.addIssue({
      code: import_zod5.z.ZodIssueCode.custom,
      path: ["shortAnswer"],
      message: "Fill-in-the-blanks questions require shortAnswer or acceptedAnswers"
    });
  }
});
var aiGenerateQuestionsSchema = import_zod5.z.object({
  subjectId: import_zod5.z.string().uuid(),
  subjectName: import_zod5.z.string().trim().min(2).max(100),
  topic: import_zod5.z.string().trim().min(2).max(200),
  schoolLevel: import_zod5.z.enum(["primary", "secondary"]),
  gradeLevel: import_zod5.z.string().trim().min(2).max(64),
  questionType: import_zod5.z.enum(["mcq", "fill_blanks", "theory"]).default("mcq"),
  difficulty: import_zod5.z.enum(["basic", "intermediate", "advanced"]).default("intermediate"),
  count: import_zod5.z.number().int().min(1).max(15).default(5),
  saveToBank: import_zod5.z.boolean().optional().default(false)
});
var createExamSchema = import_zod5.z.object({
  title: import_zod5.z.string().trim().min(3).max(200),
  branchId: import_zod5.z.string().uuid().nullable().optional(),
  schoolId: import_zod5.z.string().uuid().nullable().optional(),
  schoolLevel: import_zod5.z.enum(["primary", "secondary"]),
  sessionId: import_zod5.z.string().uuid(),
  termId: import_zod5.z.string().uuid(),
  sessionType: import_zod5.z.enum(["single_subject_ca", "two_subject_daily", "national_jamb_mock", "term_exam"]).default("single_subject_ca"),
  assessmentType: import_zod5.z.enum(["CA1", "CA2", "CA3", "CA4", "Exam"]).default("CA1"),
  instructions: import_zod5.z.array(import_zod5.z.string().trim().min(1)).default([]),
  durationMinutes: import_zod5.z.number().int().min(5).max(360),
  passingScore: import_zod5.z.number().min(0).max(100).default(50),
  scheduledAt: import_zod5.z.coerce.date().optional(),
  endsAt: import_zod5.z.coerce.date().optional(),
  accessPin: import_zod5.z.string().trim().min(4).max(16).optional(),
  targetClassIds: import_zod5.z.array(import_zod5.z.string().uuid()).min(1),
  sections: import_zod5.z.array(
    import_zod5.z.object({
      subjectId: import_zod5.z.string().uuid(),
      title: import_zod5.z.string().trim().min(2).max(120),
      questionBankItemIds: import_zod5.z.array(import_zod5.z.string().uuid()).min(1)
    })
  ).min(1),
  allowCalculator: import_zod5.z.boolean().optional().default(false),
  shuffleQuestions: import_zod5.z.boolean().optional().default(true),
  shuffleOptions: import_zod5.z.boolean().optional().default(true),
  allowBackwardNavigation: import_zod5.z.boolean().optional().default(true),
  strictProctoring: import_zod5.z.boolean().optional().default(true),
  maxInfractions: import_zod5.z.number().int().min(1).max(20).optional().default(3),
  maxTabSwitches: import_zod5.z.number().int().min(1).max(20).optional().default(3),
  autoPublishResults: import_zod5.z.boolean().optional().default(false),
  showStudentFeedback: import_zod5.z.boolean().optional().default(true),
  showCorrectAnswers: import_zod5.z.boolean().optional().default(false),
  enableLiveMonitoring: import_zod5.z.boolean().optional().default(true)
});
var approveExamSchema = import_zod5.z.object({
  status: import_zod5.z.enum(["scheduled", "live"]).default("scheduled"),
  scheduledAt: import_zod5.z.coerce.date().optional(),
  endsAt: import_zod5.z.coerce.date().optional(),
  accessPin: import_zod5.z.string().trim().min(4).max(16).optional()
});
var gradeTheoryAnswerSchema = import_zod5.z.object({
  awardedPoints: import_zod5.z.number().min(0).max(100).optional(),
  rubricBreakdown: import_zod5.z.array(
    import_zod5.z.object({
      criterionId: import_zod5.z.string().min(1),
      score: import_zod5.z.number().min(0).max(100),
      comment: import_zod5.z.string().max(500).optional()
    })
  ).optional(),
  graderFeedback: import_zod5.z.string().trim().max(2e3).optional()
});
var upsertGradebookSchema = import_zod5.z.object({
  studentProfileId: import_zod5.z.string().uuid(),
  classId: import_zod5.z.string().uuid(),
  subjectId: import_zod5.z.string().uuid(),
  sessionId: import_zod5.z.string().uuid(),
  termId: import_zod5.z.string().uuid(),
  ca1Score: import_zod5.z.number().min(0).max(20).default(0),
  ca2Score: import_zod5.z.number().min(0).max(20).default(0),
  ca3Score: import_zod5.z.number().min(0).max(20).default(0),
  ca4Score: import_zod5.z.number().min(0).max(20).default(0),
  terminalExamScore: import_zod5.z.number().min(0).max(100).default(0),
  overrideReason: import_zod5.z.string().trim().max(300).optional()
});

// src/controllers/exam.controller.ts
var examController = {
  // Question Bank
  async listQuestionBank(req, res) {
    const data = await questionBankService.list(req.auth.user, {
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : void 0,
      schoolLevel: req.query.schoolLevel === "primary" || req.query.schoolLevel === "secondary" ? req.query.schoolLevel : void 0,
      difficulty: req.query.difficulty === "basic" || req.query.difficulty === "intermediate" || req.query.difficulty === "advanced" ? req.query.difficulty : void 0
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createQuestionBankItem(req, res) {
    const payload = createQuestionBankSchema.parse(req.body);
    const data = await questionBankService.create(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async deleteQuestionBankItem(req, res) {
    const data = await questionBankService.softDelete(
      req.auth.user,
      String(req.params.questionId),
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async generateAiQuestions(req, res) {
    const payload = aiGenerateQuestionsSchema.parse(req.body);
    const data = await questionBankService.generateWithAi(req.auth.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  // Exams
  async listExams(req, res) {
    const data = await examService.list(req.auth.user, {
      status: typeof req.query.status === "string" ? req.query.status : void 0,
      termId: typeof req.query.termId === "string" ? req.query.termId : void 0
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async getExamById(req, res) {
    const data = await examService.getById(req.auth.user, String(req.params.examId));
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createExam(req, res) {
    const payload = createExamSchema.parse(req.body);
    const data = await examService.create(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async publishExam(req, res) {
    const desired = req.body?.status === "scheduled" ? "scheduled" : "live";
    const data = await examService.publishOrSubmitForApproval(
      req.auth.user,
      String(req.params.examId),
      desired,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async approveExam(req, res) {
    const payload = approveExamSchema.parse(req.body);
    const data = await examService.approveExam(
      req.auth.user,
      String(req.params.examId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  // Theory Grading & Gradebook
  async gradeTheoryAnswer(req, res) {
    const payload = gradeTheoryAnswerSchema.parse(req.body);
    const data = await gradebookService.gradeTheoryAnswer(
      req.auth.user,
      String(req.params.attemptId),
      String(req.params.answerId),
      payload,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async upsertGradebook(req, res) {
    const payload = upsertGradebookSchema.parse(req.body);
    const data = await gradebookService.upsertRecord(req.auth.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async listGradebook(req, res) {
    const termId = typeof req.query.termId === "string" ? req.query.termId : void 0;
    if (!termId) throw new BadRequestException("termId query parameter is required.");
    const data = await gradebookService.listByClassAndTerm(req.auth.user, {
      termId,
      classId: typeof req.query.classId === "string" ? req.query.classId : void 0,
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : void 0
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async exportGradebookCsv(req, res) {
    const termId = typeof req.query.termId === "string" ? req.query.termId : void 0;
    const classId = typeof req.query.classId === "string" ? req.query.classId : void 0;
    if (!termId || !classId) {
      throw new BadRequestException("termId and classId query parameters are required.");
    }
    const csv = await gradebookService.exportClassCsv(req.auth.user, {
      termId,
      classId,
      subjectId: typeof req.query.subjectId === "string" ? req.query.subjectId : void 0
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="gradebook-${classId}.csv"`);
    res.status(HttpStatus.OK).send(csv);
  }
};

// src/middlewares/asyncHandler.middleware.ts
var asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// src/middlewares/auth.middleware.ts
var import_node2 = require("better-auth/node");
var import_drizzle_orm7 = require("drizzle-orm");
var requireAuth = async (req, _res, next) => {
  try {
    const sessionData = await auth.api.getSession({
      headers: (0, import_node2.fromNodeHeaders)(req.headers)
    });
    if (!sessionData?.session || !sessionData?.user) {
      next(new UnauthorizedException("Authentication required."));
      return;
    }
    const [dbUser] = await db.select().from(user).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(user.id, sessionData.user.id), (0, import_drizzle_orm7.isNull)(user.deletedAt))).limit(1);
    if (!dbUser || dbUser.banned || dbUser.status === "suspended") {
      next(new ForbiddenException("Account is suspended or inactive."));
      return;
    }
    if (dbUser.status === "pending") {
      next(new ForbiddenException("Account activation is pending."));
      return;
    }
    req.auth = {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        username: dbUser.username,
        role: dbUser.role,
        status: dbUser.status,
        mustChangePassword: dbUser.mustChangePassword,
        twoFactorEnabled: Boolean(dbUser.twoFactorEnabled),
        primaryBranchId: dbUser.primaryBranchId,
        primarySchoolId: dbUser.primarySchoolId,
        image: dbUser.image
      },
      session: {
        id: sessionData.session.id,
        token: sessionData.session.token,
        expiresAt: new Date(sessionData.session.expiresAt),
        ipAddress: sessionData.session.ipAddress ?? null,
        userAgent: sessionData.session.userAgent ?? null
      }
    };
    next();
  } catch (error) {
    next(error);
  }
};
var requireMfaForAdmins = (req, _res, next) => {
  const actor = req.auth?.user;
  if (!actor) {
    next(new UnauthorizedException("Authentication required."));
    return;
  }
  if (ADMIN_MFA_ROLES.has(actor.role) && !actor.twoFactorEnabled) {
    next(
      new MfaRequiredException(
        "Two-factor authentication must be enabled before accessing administrator endpoints."
      )
    );
    return;
  }
  next();
};
var requireRole = (...allowedRoles) => {
  return (req, _res, next) => {
    const actor = req.auth?.user;
    if (!actor) {
      next(new UnauthorizedException("Authentication required."));
      return;
    }
    if (!allowedRoles.includes(actor.role)) {
      next(new ForbiddenException("Insufficient role privileges for this operation."));
      return;
    }
    next();
  };
};
var requirePermission = (...requiredPermissions) => {
  return (req, _res, next) => {
    const actor = req.auth?.user;
    if (!actor) {
      next(new UnauthorizedException("Authentication required."));
      return;
    }
    const allowed = requiredPermissions.every((perm) => hasPermission(actor.role, perm));
    if (!allowed) {
      next(
        new ForbiddenException(
          `Missing required permission: ${requiredPermissions.join(", ")}`
        )
      );
      return;
    }
    next();
  };
};

// src/routes/v1/attempts.route.ts
var attemptsRoutes = (0, import_express.Router)();
attemptsRoutes.use(requireAuth, requireMfaForAdmins);
attemptsRoutes.get(
  "/my-results",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  asyncHandler(cbtController.listMyResults)
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
attemptsRoutes.patch(
  "/:attemptId/answers/:answerId/grade",
  requirePermission(PERMISSIONS.ATTEMPT_GRADE_THEORY),
  asyncHandler(examController.gradeTheoryAnswer)
);

// src/routes/v1/exams.route.ts
var import_express2 = require("express");
var examsRoutes = (0, import_express2.Router)();
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
examsRoutes.post(
  "/:examId/attempts/start",
  requirePermission(PERMISSIONS.EXAM_TAKE),
  pinLimiter,
  submitLimiter,
  asyncHandler(cbtController.startAttempt)
);

// src/routes/v1/gradebook.route.ts
var import_express3 = require("express");
var gradebookRoutes = (0, import_express3.Router)();
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

// src/routes/v1/institution.route.ts
var import_express4 = require("express");

// src/services/institution.service.ts
var import_drizzle_orm8 = require("drizzle-orm");
var institutionService = {
  async listBranches() {
    return db.select().from(branches).where((0, import_drizzle_orm8.isNull)(branches.deletedAt)).orderBy(branches.name);
  },
  async createBranch(input, req) {
    const [created] = await db.insert(branches).values(input).returning();
    await auditService.log({
      action: "institution.branch.create",
      entityType: "branch",
      entityId: created.id,
      branchId: created.id,
      metadata: { name: created.name, code: created.code },
      req
    });
    return created;
  },
  async listSchools(branchId) {
    const conditions = [(0, import_drizzle_orm8.isNull)(schools.deletedAt)];
    if (branchId) conditions.push((0, import_drizzle_orm8.eq)(schools.branchId, branchId));
    return db.select().from(schools).where((0, import_drizzle_orm8.and)(...conditions)).orderBy(schools.name);
  },
  async createSchool(input, req) {
    const [created] = await db.insert(schools).values(input).returning();
    await auditService.log({
      action: "institution.school.create",
      entityType: "school",
      entityId: created.id,
      branchId: created.branchId,
      schoolId: created.id,
      metadata: { level: created.level, name: created.name },
      req
    });
    return created;
  },
  async listAcademicSessions() {
    const allSessions = await db.select().from(academicSessions).orderBy((0, import_drizzle_orm8.desc)(academicSessions.createdAt));
    const allTerms = await db.select().from(terms).orderBy(terms.orderIndex);
    return allSessions.map((s) => ({
      ...s,
      terms: allTerms.filter((t) => t.sessionId === s.id)
    }));
  },
  async createAcademicSession(input, req) {
    const created = await db.transaction(async (tx) => {
      if (input.isActive) {
        await tx.update(academicSessions).set({ isActive: false });
      }
      const [row] = await tx.insert(academicSessions).values(input).returning();
      return row;
    });
    await auditService.log({
      action: "institution.session.create",
      entityType: "academic_session",
      entityId: created.id,
      metadata: { label: created.label, isActive: created.isActive },
      req
    });
    return created;
  },
  async createTerm(input, req) {
    const created = await db.transaction(async (tx) => {
      if (input.isActive) {
        await tx.update(terms).set({ isActive: false });
      }
      const [row] = await tx.insert(terms).values(input).returning();
      return row;
    });
    await auditService.log({
      action: "institution.term.create",
      entityType: "term",
      entityId: created.id,
      metadata: { name: created.name, sessionId: created.sessionId },
      req
    });
    return created;
  },
  async listClasses(actor, schoolId) {
    const conditions = [(0, import_drizzle_orm8.isNull)(classes.deletedAt)];
    const effectiveSchoolId = actor.role === "super_admin" ? schoolId : actor.primarySchoolId ?? schoolId;
    if (effectiveSchoolId) {
      conditions.push((0, import_drizzle_orm8.eq)(classes.schoolId, effectiveSchoolId));
    }
    return db.select().from(classes).where((0, import_drizzle_orm8.and)(...conditions)).orderBy(classes.name);
  },
  async createClass(actor, input, req) {
    const targetSchoolId = input.schoolId ?? actor.primarySchoolId;
    if (!targetSchoolId) {
      throw new BadRequestException("schoolId is required.");
    }
    const school = await scopeService.assertSchoolAccess(actor, targetSchoolId);
    const [created] = await db.insert(classes).values({
      ...input,
      schoolId: school.id,
      isPrimarySelfContained: input.isPrimarySelfContained ?? school.level === "primary"
    }).returning();
    await auditService.log({
      action: "academics.class.create",
      entityType: "class",
      entityId: created.id,
      branchId: school.branchId,
      schoolId: school.id,
      metadata: { name: created.name, code: created.code },
      req
    });
    return created;
  },
  async listSubjects(schoolLevel) {
    const conditions = [(0, import_drizzle_orm8.isNull)(subjects.deletedAt)];
    if (schoolLevel) conditions.push((0, import_drizzle_orm8.eq)(subjects.schoolLevel, schoolLevel));
    return db.select().from(subjects).where((0, import_drizzle_orm8.and)(...conditions)).orderBy(subjects.name);
  },
  async createSubject(actor, input, req) {
    const targetSchoolId = input.schoolId ?? actor.primarySchoolId ?? void 0;
    if (targetSchoolId) {
      await scopeService.assertSchoolAccess(actor, targetSchoolId);
    }
    const [created] = await db.insert(subjects).values({
      ...input,
      schoolId: targetSchoolId ?? null
    }).returning();
    await auditService.log({
      action: "academics.subject.create",
      entityType: "subject",
      entityId: created.id,
      schoolId: targetSchoolId ?? null,
      metadata: { name: created.name, code: created.code, schoolLevel: created.schoolLevel },
      req
    });
    return created;
  },
  async createTeacherAssignment(actor, input, req) {
    const targetSchoolId = input.schoolId ?? actor.primarySchoolId;
    if (!targetSchoolId) {
      throw new BadRequestException("schoolId is required.");
    }
    const school = await scopeService.assertSchoolAccess(actor, targetSchoolId);
    if (!input.isAllClassSubjects && !input.subjectId) {
      throw new BadRequestException(
        "subjectId is required unless isAllClassSubjects is true (Primary self-contained class)."
      );
    }
    const [created] = await db.insert(teacherAssignments).values({
      staffProfileId: input.staffProfileId,
      branchId: input.branchId ?? school.branchId,
      schoolId: school.id,
      classId: input.classId,
      subjectId: input.isAllClassSubjects ? null : input.subjectId ?? null,
      sessionId: input.sessionId,
      isAllClassSubjects: Boolean(input.isAllClassSubjects)
    }).returning();
    await auditService.log({
      action: "academics.teacher_assignment.create",
      entityType: "teacher_assignment",
      entityId: created.id,
      branchId: school.branchId,
      schoolId: school.id,
      metadata: {
        staffProfileId: created.staffProfileId,
        classId: created.classId,
        subjectId: created.subjectId,
        isAllClassSubjects: created.isAllClassSubjects
      },
      req
    });
    return created;
  },
  async recordAttendance(actor, input, req) {
    if (actor.role === "teacher") {
      await scopeService.assertTeacherClassSubjectAccess(actor, input.classId);
    } else if (actor.role !== "super_admin") {
      const [cls] = await db.select({ schoolId: classes.schoolId }).from(classes).where((0, import_drizzle_orm8.eq)(classes.id, input.classId)).limit(1);
      if (cls) {
        await scopeService.assertSchoolAccess(actor, cls.schoolId);
      }
    }
    const saved = await db.transaction(async (tx) => {
      const rows = [];
      for (const entry of input.entries) {
        const [row] = await tx.insert(attendanceRecords).values({
          studentProfileId: entry.studentProfileId,
          classId: input.classId,
          termId: input.termId,
          date: input.date,
          status: entry.status,
          recordedBy: actor.id,
          remarks: entry.remarks
        }).onConflictDoUpdate({
          target: [attendanceRecords.studentProfileId, attendanceRecords.date],
          set: {
            status: entry.status,
            remarks: entry.remarks,
            recordedBy: actor.id,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }).returning();
        rows.push(row);
      }
      return rows;
    });
    await auditService.log({
      action: "attendance.record",
      entityType: "class",
      entityId: input.classId,
      metadata: { date: input.date, count: saved.length },
      req
    });
    return saved;
  },
  async listAttendance(actor, filters) {
    const [cls] = await db.select({ schoolId: classes.schoolId }).from(classes).where((0, import_drizzle_orm8.eq)(classes.id, filters.classId)).limit(1);
    if (cls && actor.role !== "super_admin") {
      await scopeService.assertSchoolAccess(actor, cls.schoolId);
    }
    const conditions = [(0, import_drizzle_orm8.eq)(attendanceRecords.classId, filters.classId)];
    if (filters.date) conditions.push((0, import_drizzle_orm8.eq)(attendanceRecords.date, filters.date));
    return db.select().from(attendanceRecords).where((0, import_drizzle_orm8.and)(...conditions)).orderBy((0, import_drizzle_orm8.desc)(attendanceRecords.date));
  },
  async listAuditLogs(actor, limit = 100) {
    const capped = Math.min(200, Math.max(1, limit));
    if (actor.role === "super_admin") {
      return db.select().from(auditLogs).orderBy((0, import_drizzle_orm8.desc)(auditLogs.createdAt)).limit(capped);
    }
    const conditions = [];
    if (actor.primaryBranchId) conditions.push((0, import_drizzle_orm8.eq)(auditLogs.branchId, actor.primaryBranchId));
    if (actor.primarySchoolId) conditions.push((0, import_drizzle_orm8.eq)(auditLogs.schoolId, actor.primarySchoolId));
    return db.select().from(auditLogs).where(conditions.length ? (0, import_drizzle_orm8.and)(...conditions) : void 0).orderBy((0, import_drizzle_orm8.desc)(auditLogs.createdAt)).limit(capped);
  }
};

// src/validators/institution.validator.ts
var import_zod6 = require("zod");
var createBranchSchema = import_zod6.z.object({
  name: import_zod6.z.string().trim().min(2).max(100),
  code: import_zod6.z.string().trim().min(2).max(16).toUpperCase(),
  address: import_zod6.z.string().trim().max(255).optional(),
  phone: import_zod6.z.string().trim().max(32).optional()
});
var createSchoolSchema = import_zod6.z.object({
  branchId: import_zod6.z.string().uuid(),
  level: import_zod6.z.enum(["primary", "secondary"]),
  name: import_zod6.z.string().trim().min(2).max(150)
});
var createSessionSchema = import_zod6.z.object({
  label: import_zod6.z.string().trim().min(4).max(32),
  isActive: import_zod6.z.boolean().optional().default(false),
  startsAt: import_zod6.z.coerce.date().optional(),
  endsAt: import_zod6.z.coerce.date().optional()
});
var createTermSchema = import_zod6.z.object({
  sessionId: import_zod6.z.string().uuid(),
  name: import_zod6.z.string().trim().min(2).max(64),
  orderIndex: import_zod6.z.number().int().min(1).max(4),
  isActive: import_zod6.z.boolean().optional().default(false),
  startsAt: import_zod6.z.coerce.date().optional(),
  endsAt: import_zod6.z.coerce.date().optional()
});
var createClassSchema = import_zod6.z.object({
  schoolId: import_zod6.z.string().uuid().optional(),
  sessionId: import_zod6.z.string().uuid(),
  name: import_zod6.z.string().trim().min(2).max(100),
  code: import_zod6.z.string().trim().min(2).max(32),
  gradeLevel: import_zod6.z.string().trim().min(2).max(64),
  department: import_zod6.z.string().trim().max(64).optional(),
  room: import_zod6.z.string().trim().max(64).optional(),
  formMasterId: import_zod6.z.string().min(1).optional(),
  isPrimarySelfContained: import_zod6.z.boolean().optional().default(false),
  description: import_zod6.z.string().trim().max(500).optional()
});
var createSubjectSchema = import_zod6.z.object({
  schoolId: import_zod6.z.string().uuid().optional(),
  schoolLevel: import_zod6.z.enum(["primary", "secondary"]),
  name: import_zod6.z.string().trim().min(2).max(100),
  code: import_zod6.z.string().trim().min(2).max(24).toUpperCase(),
  category: import_zod6.z.enum(["Core", "Elective", "STEM", "Humanities", "Vocational"]).default("Core"),
  department: import_zod6.z.string().trim().max(64).optional()
});
var createTeacherAssignmentSchema = import_zod6.z.object({
  staffProfileId: import_zod6.z.string().uuid(),
  branchId: import_zod6.z.string().uuid().optional(),
  schoolId: import_zod6.z.string().uuid().optional(),
  classId: import_zod6.z.string().uuid(),
  subjectId: import_zod6.z.string().uuid().optional(),
  sessionId: import_zod6.z.string().uuid(),
  isAllClassSubjects: import_zod6.z.boolean().optional().default(false)
});
var recordAttendanceSchema = import_zod6.z.object({
  classId: import_zod6.z.string().uuid(),
  termId: import_zod6.z.string().uuid(),
  date: import_zod6.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  entries: import_zod6.z.array(
    import_zod6.z.object({
      studentProfileId: import_zod6.z.string().uuid(),
      status: import_zod6.z.enum(["present", "absent", "late", "excused"]),
      remarks: import_zod6.z.string().trim().max(255).optional()
    })
  ).min(1)
});
var mediaSignatureSchema = import_zod6.z.object({
  folder: import_zod6.z.enum(["examinify/avatars", "examinify/diagrams"])
});

// src/controllers/institution.controller.ts
var institutionController = {
  async listBranches(_req, res) {
    const data = await institutionService.listBranches();
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createBranch(req, res) {
    const payload = createBranchSchema.parse(req.body);
    const data = await institutionService.createBranch(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async listSchools(req, res) {
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : void 0;
    const data = await institutionService.listSchools(branchId);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createSchool(req, res) {
    const payload = createSchoolSchema.parse(req.body);
    const data = await institutionService.createSchool(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async listSessions(_req, res) {
    const data = await institutionService.listAcademicSessions();
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createSession(req, res) {
    const payload = createSessionSchema.parse(req.body);
    const data = await institutionService.createAcademicSession(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async createTerm(req, res) {
    const payload = createTermSchema.parse(req.body);
    const data = await institutionService.createTerm(payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async listClasses(req, res) {
    const schoolId = typeof req.query.schoolId === "string" ? req.query.schoolId : void 0;
    const data = await institutionService.listClasses(req.auth.user, schoolId);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createClass(req, res) {
    const payload = createClassSchema.parse(req.body);
    const data = await institutionService.createClass(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async listSubjects(req, res) {
    const level = req.query.schoolLevel === "primary" || req.query.schoolLevel === "secondary" ? req.query.schoolLevel : void 0;
    const data = await institutionService.listSubjects(level);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createSubject(req, res) {
    const payload = createSubjectSchema.parse(req.body);
    const data = await institutionService.createSubject(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async createTeacherAssignment(req, res) {
    const payload = createTeacherAssignmentSchema.parse(req.body);
    const data = await institutionService.createTeacherAssignment(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async recordAttendance(req, res) {
    const payload = recordAttendanceSchema.parse(req.body);
    const data = await institutionService.recordAttendance(req.auth.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async listAttendance(req, res) {
    const classId = typeof req.query.classId === "string" ? req.query.classId : void 0;
    if (!classId) throw new BadRequestException("classId query parameter is required.");
    const date2 = typeof req.query.date === "string" ? req.query.date : void 0;
    const data = await institutionService.listAttendance(req.auth.user, { classId, date: date2 });
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async listAuditLogs(req, res) {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const data = await institutionService.listAuditLogs(req.auth.user, limit);
    res.status(HttpStatus.OK).json({ success: true, data });
  }
};

// src/routes/v1/institution.route.ts
var institutionRoutes = (0, import_express4.Router)();
institutionRoutes.use(requireAuth, requireMfaForAdmins);
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
  "/subjects",
  requirePermission(PERMISSIONS.SUBJECT_READ),
  asyncHandler(institutionController.listSubjects)
);
institutionRoutes.post(
  "/subjects",
  requirePermission(PERMISSIONS.SUBJECT_MANAGE),
  asyncHandler(institutionController.createSubject)
);
institutionRoutes.post(
  "/teacher-assignments",
  requirePermission(PERMISSIONS.ASSIGNMENT_MANAGE),
  asyncHandler(institutionController.createTeacherAssignment)
);
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
institutionRoutes.get(
  "/audit-logs",
  requirePermission(PERMISSIONS.AUDIT_READ_BRANCH),
  asyncHandler(institutionController.listAuditLogs)
);

// src/routes/v1/media.route.ts
var import_express5 = require("express");

// src/config/cloudinary.config.ts
var import_cloudinary = require("cloudinary");
var ALLOWED_UPLOAD_FOLDERS = ["examinify/avatars", "examinify/diagrams"];
var ALLOWED_IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp"];
var MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
var isConfigured = Boolean(
  Env.CLOUDINARY_CLOUD_NAME && Env.CLOUDINARY_API_KEY && Env.CLOUDINARY_API_SECRET
);
if (isConfigured) {
  import_cloudinary.v2.config({
    cloud_name: Env.CLOUDINARY_CLOUD_NAME,
    api_key: Env.CLOUDINARY_API_KEY,
    api_secret: Env.CLOUDINARY_API_SECRET,
    secure: true
  });
}
var generateSignedUploadParams = (params) => {
  if (!isConfigured) {
    throw new InternalServerException(
      "Cloudinary media storage is not configured on this server."
    );
  }
  if (!ALLOWED_UPLOAD_FOLDERS.includes(params.folder)) {
    throw new BadRequestException("Invalid media upload folder.");
  }
  const timestamp8 = Math.round(Date.now() / 1e3);
  const publicIdPrefix = `${params.userId}_${timestamp8}`;
  const signParams = {
    folder: params.folder,
    public_id: publicIdPrefix,
    timestamp: timestamp8,
    allowed_formats: ALLOWED_IMAGE_FORMATS.join(",")
  };
  const signature = import_cloudinary.v2.utils.api_sign_request(
    signParams,
    Env.CLOUDINARY_API_SECRET
  );
  return {
    cloudName: Env.CLOUDINARY_CLOUD_NAME,
    apiKey: Env.CLOUDINARY_API_KEY,
    timestamp: timestamp8,
    signature,
    folder: params.folder,
    publicId: publicIdPrefix,
    allowedFormats: ALLOWED_IMAGE_FORMATS,
    maxFileSizeBytes: MAX_IMAGE_SIZE_BYTES,
    uploadUrl: `https://api.cloudinary.com/v1_1/${Env.CLOUDINARY_CLOUD_NAME}/image/upload`
  };
};

// src/routes/v1/media.route.ts
var mediaRoutes = (0, import_express5.Router)();
mediaRoutes.post(
  "/upload-signature",
  requireAuth,
  requireMfaForAdmins,
  asyncHandler(async (req, res) => {
    const { folder } = mediaSignatureSchema.parse(req.body);
    const actor = req.auth.user;
    if (folder === "examinify/diagrams" && !hasPermission(actor.role, PERMISSIONS.MEDIA_UPLOAD_DIAGRAM)) {
      throw new ForbiddenException("Only staff with authoring permissions can upload question diagrams.");
    }
    const signed = generateSignedUploadParams({
      folder,
      userId: actor.id
    });
    res.status(HttpStatus.OK).json({ success: true, data: signed });
  })
);

// src/routes/v1/question-bank.route.ts
var import_express6 = require("express");
var questionBankRoutes = (0, import_express6.Router)();
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

// src/routes/v1/users.route.ts
var import_express7 = require("express");

// src/services/user.service.ts
var import_crypto = __toESM(require("crypto"));
var import_drizzle_orm9 = require("drizzle-orm");
var import_crypto2 = require("better-auth/crypto");
var import_papaparse2 = __toESM(require("papaparse"));
var mapRoleToStaffCategory = (role) => {
  if (role === "super_admin" || role === "school_admin") return "admin";
  if (role === "non_academic_staff") return "non_academic";
  return "academic";
};
var userService = {
  async getMe(actor) {
    const [dbUser] = await db.select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      displayUsername: user.displayUsername,
      role: user.role,
      status: user.status,
      image: user.image,
      mustChangePassword: user.mustChangePassword,
      twoFactorEnabled: user.twoFactorEnabled,
      primaryBranchId: user.primaryBranchId,
      primarySchoolId: user.primarySchoolId,
      createdAt: user.createdAt
    }).from(user).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(user.id, actor.id), (0, import_drizzle_orm9.isNull)(user.deletedAt))).limit(1);
    if (!dbUser) {
      throw new NotFoundException("User not found.");
    }
    const [branch] = dbUser.primaryBranchId ? await db.select().from(branches).where((0, import_drizzle_orm9.eq)(branches.id, dbUser.primaryBranchId)).limit(1) : [null];
    const [school] = dbUser.primarySchoolId ? await db.select().from(schools).where((0, import_drizzle_orm9.eq)(schools.id, dbUser.primarySchoolId)).limit(1) : [null];
    if (dbUser.role === "student") {
      const [profile] = await db.select().from(studentProfiles).where((0, import_drizzle_orm9.eq)(studentProfiles.userId, dbUser.id)).limit(1);
      const studentGuardians = profile ? await db.select().from(guardians).where((0, import_drizzle_orm9.eq)(guardians.studentProfileId, profile.id)) : [];
      return { ...dbUser, branch, school, studentProfile: profile ?? null, guardians: studentGuardians };
    }
    const [staff] = await db.select().from(staffProfiles).where((0, import_drizzle_orm9.eq)(staffProfiles.userId, dbUser.id)).limit(1);
    return { ...dbUser, branch, school, staffProfile: staff ?? null };
  },
  async createSchoolAdmin(actor, input, req) {
    if (!canProvisionRole(actor.role, "school_admin")) {
      throw new ForbiddenException("Only the Super Admin can create School Admin accounts.");
    }
    const [school] = await db.select().from(schools).where(
      (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(schools.id, input.schoolId),
        (0, import_drizzle_orm9.eq)(schools.branchId, input.branchId),
        (0, import_drizzle_orm9.isNull)(schools.deletedAt)
      )
    ).limit(1);
    if (!school) {
      throw new BadRequestException("Selected school does not belong to the specified branch.");
    }
    const normalizedUsername = input.username.trim().toLowerCase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const [existing] = await db.select({ id: user.id }).from(user).where((0, import_drizzle_orm9.or)((0, import_drizzle_orm9.eq)(user.email, normalizedEmail), (0, import_drizzle_orm9.eq)(user.username, normalizedUsername))).limit(1);
    if (existing) {
      throw new ConflictException("A user with this username or email already exists.");
    }
    const [existingStaff] = await db.select({ id: staffProfiles.id }).from(staffProfiles).where((0, import_drizzle_orm9.eq)(staffProfiles.staffId, input.staffId)).limit(1);
    if (existingStaff) {
      throw new ConflictException("A staff member with this staffId already exists.");
    }
    const passwordHash = await (0, import_crypto2.hashPassword)(input.password);
    const userId = import_crypto.default.randomUUID();
    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(user).values({
        id: userId,
        name: input.name,
        email: normalizedEmail,
        emailVerified: true,
        username: normalizedUsername,
        displayUsername: input.username.trim(),
        role: "school_admin",
        status: "active",
        mustChangePassword: true,
        primaryBranchId: input.branchId,
        primarySchoolId: input.schoolId
      }).returning();
      await tx.insert(account).values({
        id: import_crypto.default.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash
      });
      const [profile] = await tx.insert(staffProfiles).values({
        userId,
        staffId: input.staffId,
        staffCategory: "admin",
        title: input.title ?? "School Administrator",
        phone: input.phone,
        department: input.department ?? "Administration"
      }).returning();
      return { user: newUser, staffProfile: profile };
    });
    await auditService.log({
      action: "user.create.school_admin",
      entityType: "user",
      entityId: userId,
      branchId: input.branchId,
      schoolId: input.schoolId,
      metadata: { username: normalizedUsername, role: "school_admin", staffId: input.staffId },
      req
    });
    await emailService.sendAccountProvisionedEmail({
      to: normalizedEmail,
      name: input.name,
      username: input.username.trim(),
      role: "school_admin"
    }).catch(() => void 0);
    return created;
  },
  async createBranchMember(actor, input, req) {
    if (!canProvisionRole(actor.role, input.role)) {
      throw new ForbiddenException(
        `Role '${actor.role}' is not permitted to create '${input.role}' accounts.`
      );
    }
    const targetBranchId = input.branchId ?? actor.primaryBranchId;
    const targetSchoolId = input.schoolId ?? actor.primarySchoolId;
    if (!targetBranchId || !targetSchoolId) {
      throw new BadRequestException("branchId and schoolId are required.");
    }
    scopeService.assertBranchSchoolScope(actor, {
      branchId: targetBranchId,
      schoolId: targetSchoolId
    });
    const [school] = await db.select().from(schools).where(
      (0, import_drizzle_orm9.and)(
        (0, import_drizzle_orm9.eq)(schools.id, targetSchoolId),
        (0, import_drizzle_orm9.eq)(schools.branchId, targetBranchId),
        (0, import_drizzle_orm9.isNull)(schools.deletedAt)
      )
    ).limit(1);
    if (!school) {
      throw new BadRequestException("Target school does not belong to the specified branch.");
    }
    const normalizedUsername = input.username.trim().toLowerCase();
    const normalizedEmail = input.email.trim().toLowerCase();
    const [existing] = await db.select({ id: user.id }).from(user).where((0, import_drizzle_orm9.or)((0, import_drizzle_orm9.eq)(user.email, normalizedEmail), (0, import_drizzle_orm9.eq)(user.username, normalizedUsername))).limit(1);
    if (existing) {
      throw new ConflictException("A user with this username or email already exists.");
    }
    const passwordHash = await (0, import_crypto2.hashPassword)(input.password);
    const userId = import_crypto.default.randomUUID();
    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(user).values({
        id: userId,
        name: input.name,
        email: normalizedEmail,
        emailVerified: true,
        username: normalizedUsername,
        displayUsername: input.username.trim(),
        role: input.role,
        status: "active",
        mustChangePassword: true,
        primaryBranchId: targetBranchId,
        primarySchoolId: targetSchoolId
      }).returning();
      await tx.insert(account).values({
        id: import_crypto.default.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash
      });
      if (input.role === "student") {
        const [studentProfile] = await tx.insert(studentProfiles).values({
          userId,
          registrationNumber: input.registrationNumber,
          gender: input.gender ?? "male",
          phone: input.phone,
          gradeLevel: input.gradeLevel,
          department: input.department,
          targetExamTrack: input.targetExamTrack,
          targetExamYear: input.targetExamYear
        }).returning();
        if (input.guardian) {
          await tx.insert(guardians).values({
            studentProfileId: studentProfile.id,
            fullName: input.guardian.fullName,
            relationship: input.guardian.relationship,
            phone: input.guardian.phone,
            email: input.guardian.email,
            address: input.guardian.address,
            isPrimary: true
          });
        }
        if (input.classId) {
          const [cls] = await tx.select().from(classes).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(classes.id, input.classId), (0, import_drizzle_orm9.eq)(classes.schoolId, targetSchoolId))).limit(1);
          if (!cls) {
            throw new BadRequestException("Target class not found in this school.");
          }
          let sessionId = input.sessionId ?? cls.sessionId;
          if (!sessionId) {
            const [activeSession] = await tx.select().from(academicSessions).where((0, import_drizzle_orm9.eq)(academicSessions.isActive, true)).limit(1);
            if (!activeSession) {
              throw new BadRequestException("No active academic session configured.");
            }
            sessionId = activeSession.id;
          }
          await tx.insert(studentEnrollments).values({
            studentProfileId: studentProfile.id,
            classId: cls.id,
            sessionId,
            isActive: true
          });
        }
        return { user: newUser, studentProfile };
      }
      const [staffProfile] = await tx.insert(staffProfiles).values({
        userId,
        staffId: input.staffId,
        staffCategory: mapRoleToStaffCategory(input.role),
        title: input.title,
        phone: input.phone,
        department: input.department,
        qualifications: input.qualifications ?? [],
        specializations: input.specializations ?? []
      }).returning();
      return { user: newUser, staffProfile };
    });
    await auditService.log({
      action: `user.create.${input.role}`,
      entityType: "user",
      entityId: userId,
      branchId: targetBranchId,
      schoolId: targetSchoolId,
      metadata: { username: normalizedUsername, role: input.role },
      req
    });
    await emailService.sendAccountProvisionedEmail({
      to: normalizedEmail,
      name: input.name,
      username: input.username.trim(),
      role: input.role
    }).catch(() => void 0);
    return created;
  },
  async importMembersFromCsv(actor, input, req) {
    if (actor.role !== "school_admin") {
      throw new ForbiddenException("Only School Admins can bulk-import branch accounts.");
    }
    const parsed2 = import_papaparse2.default.parse(input.csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim()
    });
    if (parsed2.errors.length > 0 && parsed2.data.length === 0) {
      throw new BadRequestException("Unable to parse CSV file.", parsed2.errors);
    }
    const results = [];
    for (let i = 0; i < parsed2.data.length; i += 1) {
      const row = parsed2.data[i];
      const rowNum = i + 2;
      try {
        const role = (row.role || "student").trim();
        const payload = {
          role,
          name: (row.name || "").trim(),
          username: (row.username || row.registrationNumber || row.staffId || "").trim(),
          email: (row.email || "").trim(),
          password: (row.password || input.defaultPassword || "Examinify@2026").trim(),
          registrationNumber: row.registrationNumber?.trim(),
          staffId: row.staffId?.trim(),
          gradeLevel: row.gradeLevel?.trim(),
          gender: row.gender?.trim().toLowerCase() || "male",
          department: row.department?.trim(),
          title: row.title?.trim(),
          phone: row.phone?.trim(),
          classId: row.classId?.trim() || input.classId,
          sessionId: input.sessionId
        };
        await this.createBranchMember(actor, payload, req);
        results.push({ row: rowNum, username: payload.username, status: "created" });
      } catch (err) {
        results.push({
          row: rowNum,
          username: row.username,
          status: "failed",
          error: err.message
        });
      }
    }
    return {
      total: results.length,
      createdCount: results.filter((r) => r.status === "created").length,
      failedCount: results.filter((r) => r.status === "failed").length,
      results
    };
  },
  async listDirectory(actor, filters) {
    const conditions = [(0, import_drizzle_orm9.isNull)(user.deletedAt)];
    if (actor.role !== "super_admin") {
      if (actor.primaryBranchId) {
        conditions.push((0, import_drizzle_orm9.eq)(user.primaryBranchId, actor.primaryBranchId));
      }
      if (actor.primarySchoolId) {
        conditions.push((0, import_drizzle_orm9.eq)(user.primarySchoolId, actor.primarySchoolId));
      }
    } else {
      if (filters.branchId) conditions.push((0, import_drizzle_orm9.eq)(user.primaryBranchId, filters.branchId));
      if (filters.schoolId) conditions.push((0, import_drizzle_orm9.eq)(user.primarySchoolId, filters.schoolId));
    }
    if (filters.role) {
      conditions.push((0, import_drizzle_orm9.eq)(user.role, filters.role));
    }
    if (filters.search) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        (0, import_drizzle_orm9.or)(
          (0, import_drizzle_orm9.ilike)(user.name, pattern),
          (0, import_drizzle_orm9.ilike)(user.username, pattern),
          (0, import_drizzle_orm9.ilike)(user.email, pattern)
        )
      );
    }
    return db.select({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      primaryBranchId: user.primaryBranchId,
      primarySchoolId: user.primarySchoolId,
      createdAt: user.createdAt
    }).from(user).where((0, import_drizzle_orm9.and)(...conditions)).orderBy((0, import_drizzle_orm9.desc)(user.createdAt)).limit(200);
  },
  async updateUserStatus(actor, targetUserId, status, reason, req) {
    const [target] = await db.select().from(user).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(user.id, targetUserId), (0, import_drizzle_orm9.isNull)(user.deletedAt))).limit(1);
    if (!target) {
      throw new NotFoundException("User not found.");
    }
    if (target.role === "super_admin") {
      throw new ForbiddenException("Super Admin account status cannot be modified here.");
    }
    scopeService.assertBranchSchoolScope(actor, {
      branchId: target.primaryBranchId,
      schoolId: target.primarySchoolId
    });
    const [updated] = await db.update(user).set({
      status,
      banned: status === "suspended",
      banReason: status === "suspended" ? reason ?? "Suspended by administrator" : null,
      updatedAt: /* @__PURE__ */ new Date()
    }).where((0, import_drizzle_orm9.eq)(user.id, targetUserId)).returning({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      status: user.status
    });
    await auditService.log({
      action: "user.status.update",
      entityType: "user",
      entityId: targetUserId,
      branchId: target.primaryBranchId,
      schoolId: target.primarySchoolId,
      metadata: { status, reason },
      req
    });
    return updated;
  },
  async completeFirstLoginPasswordChange(actor, currentPassword, newPassword, req) {
    const [cred] = await db.select().from(account).where((0, import_drizzle_orm9.and)((0, import_drizzle_orm9.eq)(account.userId, actor.id), (0, import_drizzle_orm9.eq)(account.providerId, "credential"))).limit(1);
    if (!cred?.password) {
      throw new BadRequestException("Password credential not found for this account.");
    }
    const valid = await (0, import_crypto2.verifyPassword)({ hash: cred.password, password: currentPassword });
    if (!valid) {
      throw new BadRequestException("Current password is incorrect.");
    }
    const newHash = await (0, import_crypto2.hashPassword)(newPassword);
    await db.transaction(async (tx) => {
      await tx.update(account).set({ password: newHash, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm9.eq)(account.id, cred.id));
      await tx.update(user).set({ mustChangePassword: false, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm9.eq)(user.id, actor.id));
    });
    await auditService.log({
      action: "user.password.first_login_changed",
      entityType: "user",
      entityId: actor.id,
      req
    });
    return { updated: true };
  }
};

// src/validators/user.validator.ts
var import_zod7 = require("zod");
var usernameSchema = import_zod7.z.string().trim().min(3, "Username must be at least 3 characters").max(64, "Username must be at most 64 characters").regex(/^[a-zA-Z0-9._/-]+$/, "Username contains invalid characters");
var createSchoolAdminSchema = import_zod7.z.object({
  name: import_zod7.z.string().trim().min(2).max(120),
  username: usernameSchema,
  email: import_zod7.z.string().trim().email(),
  password: import_zod7.z.string().min(8).max(128),
  branchId: import_zod7.z.string().uuid(),
  schoolId: import_zod7.z.string().uuid(),
  staffId: import_zod7.z.string().trim().min(2).max(64),
  title: import_zod7.z.string().trim().max(100).optional(),
  phone: import_zod7.z.string().trim().max(32).optional(),
  department: import_zod7.z.string().trim().max(100).optional()
});
var guardianSchema = import_zod7.z.object({
  fullName: import_zod7.z.string().trim().min(2).max(120),
  relationship: import_zod7.z.string().trim().min(2).max(64),
  phone: import_zod7.z.string().trim().min(6).max(32),
  email: import_zod7.z.string().trim().email().optional(),
  address: import_zod7.z.string().trim().max(255).optional()
});
var createBranchMemberSchema = import_zod7.z.object({
  role: import_zod7.z.enum(["examiner", "teacher", "non_academic_staff", "student"]),
  name: import_zod7.z.string().trim().min(2).max(120),
  username: usernameSchema,
  email: import_zod7.z.string().trim().email(),
  password: import_zod7.z.string().min(8).max(128),
  branchId: import_zod7.z.string().uuid().optional(),
  schoolId: import_zod7.z.string().uuid().optional(),
  // Student-specific fields
  registrationNumber: import_zod7.z.string().trim().min(2).max(64).optional(),
  gender: import_zod7.z.enum(["male", "female"]).optional(),
  gradeLevel: import_zod7.z.string().trim().max(64).optional(),
  classId: import_zod7.z.string().uuid().optional(),
  sessionId: import_zod7.z.string().uuid().optional(),
  targetExamTrack: import_zod7.z.string().trim().max(100).optional(),
  targetExamYear: import_zod7.z.string().trim().max(16).optional(),
  guardian: guardianSchema.optional(),
  // Staff-specific fields
  staffId: import_zod7.z.string().trim().min(2).max(64).optional(),
  title: import_zod7.z.string().trim().max(100).optional(),
  phone: import_zod7.z.string().trim().max(32).optional(),
  department: import_zod7.z.string().trim().max(100).optional(),
  qualifications: import_zod7.z.array(import_zod7.z.string().trim()).optional(),
  specializations: import_zod7.z.array(import_zod7.z.string().trim()).optional()
}).superRefine((data, ctx) => {
  if (data.role === "student") {
    if (!data.registrationNumber) {
      ctx.addIssue({
        code: import_zod7.z.ZodIssueCode.custom,
        path: ["registrationNumber"],
        message: "registrationNumber is required when creating a student account"
      });
    }
    if (!data.gradeLevel) {
      ctx.addIssue({
        code: import_zod7.z.ZodIssueCode.custom,
        path: ["gradeLevel"],
        message: "gradeLevel is required when creating a student account"
      });
    }
  } else if (!data.staffId) {
    ctx.addIssue({
      code: import_zod7.z.ZodIssueCode.custom,
      path: ["staffId"],
      message: "staffId is required when creating a staff account"
    });
  }
});
var importCsvMembersSchema = import_zod7.z.object({
  csvContent: import_zod7.z.string().min(10, "CSV content is required"),
  defaultPassword: import_zod7.z.string().min(8).max(128).optional(),
  classId: import_zod7.z.string().uuid().optional(),
  sessionId: import_zod7.z.string().uuid().optional()
});
var updateUserStatusSchema = import_zod7.z.object({
  status: import_zod7.z.enum(["pending", "active", "suspended"]),
  reason: import_zod7.z.string().trim().max(255).optional()
});
var completeFirstLoginSchema = import_zod7.z.object({
  currentPassword: import_zod7.z.string().min(1),
  newPassword: import_zod7.z.string().min(8).max(128)
});

// src/controllers/user.controller.ts
var userController = {
  async getMe(req, res) {
    const data = await userService.getMe(req.auth.user);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async createSchoolAdmin(req, res) {
    const payload = createSchoolAdminSchema.parse(req.body);
    const data = await userService.createSchoolAdmin(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async createBranchMember(req, res) {
    const payload = createBranchMemberSchema.parse(req.body);
    const data = await userService.createBranchMember(req.auth.user, payload, req);
    res.status(HttpStatus.CREATED).json({ success: true, data });
  },
  async importMembersCsv(req, res) {
    const payload = importCsvMembersSchema.parse(req.body);
    const data = await userService.importMembersFromCsv(req.auth.user, payload, req);
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async listDirectory(req, res) {
    const data = await userService.listDirectory(req.auth.user, {
      role: typeof req.query.role === "string" ? req.query.role : void 0,
      search: typeof req.query.search === "string" ? req.query.search : void 0,
      branchId: typeof req.query.branchId === "string" ? req.query.branchId : void 0,
      schoolId: typeof req.query.schoolId === "string" ? req.query.schoolId : void 0
    });
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async updateStatus(req, res) {
    const payload = updateUserStatusSchema.parse(req.body);
    const data = await userService.updateUserStatus(
      req.auth.user,
      String(req.params.userId),
      payload.status,
      payload.reason,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  },
  async completeFirstLogin(req, res) {
    const payload = completeFirstLoginSchema.parse(req.body);
    const data = await userService.completeFirstLoginPasswordChange(
      req.auth.user,
      payload.currentPassword,
      payload.newPassword,
      req
    );
    res.status(HttpStatus.OK).json({ success: true, data });
  }
};

// src/routes/v1/users.route.ts
var usersRoutes = (0, import_express7.Router)();
usersRoutes.get("/me", requireAuth, asyncHandler(userController.getMe));
usersRoutes.post(
  "/me/change-initial-password",
  requireAuth,
  asyncHandler(userController.completeFirstLogin)
);
usersRoutes.post(
  "/school-admins",
  requireAuth,
  requireMfaForAdmins,
  requirePermission(PERMISSIONS.USER_CREATE_SCHOOL_ADMIN),
  asyncHandler(userController.createSchoolAdmin)
);
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

// src/routes/v1/index.ts
var v1Routes = (0, import_express8.Router)();
v1Routes.use("/users", usersRoutes);
v1Routes.use("/institution", institutionRoutes);
v1Routes.use("/media", mediaRoutes);
v1Routes.use("/question-bank", questionBankRoutes);
v1Routes.use("/exams", examsRoutes);
v1Routes.use("/attempts", attemptsRoutes);
v1Routes.use("/gradebook", gradebookRoutes);

// src/docs/swagger.ts
var import_swagger_ui_express = __toESM(require("swagger-ui-express"));

// src/docs/openapi.ts
var getOpenApiSpec = (serverUrl) => {
  const currentServer = serverUrl || Env.BETTER_AUTH_URL;
  return {
    openapi: "3.0.3",
    info: {
      title: "Examinify CBT Platform API",
      version: "2.0.0",
      description: "Production API for the Examinify multi-branch (Wuse, Guzape, Gwarinpa, Wuye) Primary & Secondary CBT Exam Management Platform.\n\n### Security & Auth Model\n- **Username + Password Only** (No Google OAuth, No public self-signup).\n- **Strict Provisioning**: `super_admin` creates `school_admin`; `school_admin` creates `examiner`, `teacher`, `non_academic_staff`, and `student`.\n- **Mandatory 2FA**: Enforced for `super_admin` and `school_admin` accounts.\n- **Server-Authoritative CBT**: Single-session lock, server timers, Access PIN verification, infraction auto-submit, and zero answer-key leakage."
    },
    servers: [{ url: currentServer, description: "Examinify API Server" }],
    tags: [
      { name: "Health" },
      { name: "Auth (Better Auth)" },
      { name: "Users & Provisioning" },
      { name: "Institution & Academics" },
      { name: "Media" },
      { name: "Question Bank & AI" },
      { name: "Exams" },
      { name: "CBT Attempts" },
      { name: "Gradebook" }
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Liveness check",
          responses: { "200": { description: "Healthy" } }
        }
      },
      "/api/auth/sign-in/username": {
        post: {
          tags: ["Auth (Better Auth)"],
          summary: "Sign in with username and password (Admins, Examiners, Teachers, Staff, Students)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["username", "password"],
                  properties: {
                    username: { type: "string", example: "EXM/GUZ/2026/001" },
                    password: { type: "string", format: "password" }
                  }
                }
              }
            }
          },
          responses: {
            "200": { description: "Authenticated with HTTP-only session cookie" },
            "401": { description: "Invalid credentials" },
            "429": { description: "Rate limited" }
          }
        }
      },
      "/api/auth/sign-out": {
        post: {
          tags: ["Auth (Better Auth)"],
          summary: "Sign out and revoke session",
          responses: { "200": { description: "Signed out" } }
        }
      },
      "/api/auth/get-session": {
        get: {
          tags: ["Auth (Better Auth)"],
          summary: "Get active session",
          responses: { "200": { description: "Active session" } }
        }
      },
      "/api/v1/users/me": {
        get: {
          tags: ["Users & Provisioning"],
          summary: "Get authenticated user profile, branch/school scope, and role profile",
          responses: { "200": { description: "User profile" } }
        }
      },
      "/api/v1/users/school-admins": {
        post: {
          tags: ["Users & Provisioning"],
          summary: "Create a School Admin account (Super Admin only)",
          responses: { "201": { description: "School Admin created" } }
        }
      },
      "/api/v1/users/members": {
        post: {
          tags: ["Users & Provisioning"],
          summary: "Create Examiner, Teacher, Non-Academic Staff, or Student (School Admin only)",
          responses: { "201": { description: "Branch member created" } }
        }
      },
      "/api/v1/users/import-csv": {
        post: {
          tags: ["Users & Provisioning"],
          summary: "Bulk CSV import of branch accounts (School Admin only)",
          responses: { "200": { description: "Import summary" } }
        }
      },
      "/api/v1/users/directory": {
        get: {
          tags: ["Users & Provisioning"],
          summary: "Scoped school directory (Non-Academic Staff, School Admin, Super Admin)",
          responses: { "200": { description: "Directory list" } }
        }
      },
      "/api/v1/institution/branches": {
        get: { tags: ["Institution & Academics"], summary: "List campus branches", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Create branch (Super Admin)", responses: { "201": { description: "Created" } } }
      },
      "/api/v1/institution/schools": {
        get: { tags: ["Institution & Academics"], summary: "List Primary/Secondary schools", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Create school (Super Admin)", responses: { "201": { description: "Created" } } }
      },
      "/api/v1/institution/classes": {
        get: { tags: ["Institution & Academics"], summary: "List classes", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Create class", responses: { "201": { description: "Created" } } }
      },
      "/api/v1/institution/attendance": {
        get: { tags: ["Institution & Academics"], summary: "List attendance records", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Record class attendance", responses: { "200": { description: "Saved" } } }
      },
      "/api/v1/media/upload-signature": {
        post: {
          tags: ["Media"],
          summary: "Generate signed Cloudinary upload parameters for avatars or STEM diagrams",
          responses: { "200": { description: "Signed upload params" } }
        }
      },
      "/api/v1/question-bank": {
        get: { tags: ["Question Bank & AI"], summary: "List question bank items", responses: { "200": { description: "OK" } } },
        post: { tags: ["Question Bank & AI"], summary: "Create question bank item", responses: { "201": { description: "Created" } } }
      },
      "/api/v1/question-bank/ai-generate": {
        post: {
          tags: ["Question Bank & AI"],
          summary: "Generate draft curriculum questions via Gemini API (Teacher quota enforced)",
          responses: { "200": { description: "Generated draft questions" } }
        }
      },
      "/api/v1/exams": {
        get: { tags: ["Exams"], summary: "List scoped exams", responses: { "200": { description: "OK" } } },
        post: { tags: ["Exams"], summary: "Create draft exam with sections and target classes", responses: { "201": { description: "Created" } } }
      },
      "/api/v1/exams/{examId}/publish": {
        post: {
          tags: ["Exams"],
          summary: "Publish CA1-CA4 directly or submit Terminal/Mock exam for Examiner/Admin approval",
          responses: { "200": { description: "Updated exam" } }
        }
      },
      "/api/v1/exams/{examId}/approve": {
        post: {
          tags: ["Exams"],
          summary: "Approve, freeze snapshots, and schedule/open exam (Examiner/School Admin)",
          responses: { "200": { description: "Approved exam" } }
        }
      },
      "/api/v1/exams/{examId}/attempts/start": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Start or resume live CBT attempt (verifies PIN, binds session lock, strips answer keys)",
          responses: { "200": { description: "Sanitized CBT attempt payload" } }
        }
      },
      "/api/v1/attempts/{attemptId}/answers": {
        put: {
          tags: ["CBT Attempts"],
          summary: "Auto-save student answer with server timer & session-lock validation",
          responses: { "200": { description: "Answer saved" } }
        }
      },
      "/api/v1/attempts/{attemptId}/infractions": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Log proctoring infraction (auto-submits if maxInfractions reached)",
          responses: { "200": { description: "Infraction recorded" } }
        }
      },
      "/api/v1/attempts/{attemptId}/submit": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Submit attempt and run server-side auto-grading",
          responses: { "200": { description: "Submission result" } }
        }
      },
      "/api/v1/attempts/{attemptId}/force-submit": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Examiner/Admin force-submit a live student attempt",
          responses: { "200": { description: "Attempt force-submitted" } }
        }
      },
      "/api/v1/attempts/{attemptId}/unlock-session": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Examiner/Admin unlocks frozen student session lock",
          responses: { "200": { description: "Session unlocked" } }
        }
      },
      "/api/v1/gradebook": {
        get: { tags: ["Gradebook"], summary: "List WAEC A1-F9 term gradebook records", responses: { "200": { description: "OK" } } },
        put: { tags: ["Gradebook"], summary: "Upsert CA1-CA4 + Exam gradebook record", responses: { "200": { description: "Saved" } } }
      },
      "/api/v1/gradebook/export": {
        get: { tags: ["Gradebook"], summary: "Export class term gradebook as CSV", responses: { "200": { description: "CSV file" } } }
      }
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token"
        }
      },
      schemas: {
        ErrorEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            errorCode: { type: "string", enum: Object.values(ErrorCodes) },
            message: { type: "string" }
          }
        }
      }
    }
  };
};

// src/docs/swagger.ts
var customCss = `
  .swagger-ui .topbar {
    background-color: #0f172a;
    border-bottom: 2px solid #3b82f6;
    padding: 12px 0;
  }
  .swagger-ui .topbar .topbar-wrapper .link {
    display: flex;
    align-items: center;
    font-weight: 700;
    font-size: 1.25rem;
    color: #ffffff;
    text-decoration: none;
  }
`;
var swaggerUiOptions = {
  customSiteTitle: "Examinify API Documentation",
  customCss,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: "list",
    filter: true,
    tryItOutEnabled: true
  }
};
var setupSwagger = (app2) => {
  if (Env.NODE_ENV === "production" && !Env.ENABLE_SWAGGER) {
    return;
  }
  const docsGuards = Env.NODE_ENV === "production" ? [requireAuth, requireRole("super_admin")] : [];
  const allowSwaggerAssets = (_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://validator.swagger.io; font-src 'self' https://fonts.gstatic.com;"
    );
    next();
  };
  const serveOpenApiJson = (req, res) => {
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${Env.PORT}`;
    const serverUrl = `${protocol}://${host}`;
    res.status(200).json(getOpenApiSpec(serverUrl));
  };
  app2.get("/docs/openapi.json", ...docsGuards, serveOpenApiJson);
  app2.get("/api-docs/openapi.json", ...docsGuards, serveOpenApiJson);
  const swaggerSetupHandler = (req, res, next) => {
    const protocol = req.protocol || "http";
    const host = req.get("host") || `localhost:${Env.PORT}`;
    const serverUrl = `${protocol}://${host}`;
    return import_swagger_ui_express.default.setup(getOpenApiSpec(serverUrl), swaggerUiOptions)(req, res, next);
  };
  app2.use("/docs", ...docsGuards, allowSwaggerAssets, import_swagger_ui_express.default.serve, swaggerSetupHandler);
  app2.use("/api-docs", ...docsGuards, allowSwaggerAssets, import_swagger_ui_express.default.serve, swaggerSetupHandler);
};

// src/app.ts
var createApp = () => {
  const app2 = (0, import_express9.default)();
  app2.set("trust proxy", 1);
  app2.use(
    (0, import_helmet.default)({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"]
        }
      }
    })
  );
  if (Env.CORS_ORIGINS.length > 0) {
    app2.use(
      (0, import_cors.default)({
        origin: (origin, callback) => {
          if (!origin || Env.CORS_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new ForbiddenException("Origin not allowed by CORS policy."));
        },
        credentials: true
      })
    );
  }
  app2.all("/api/auth/sign-up/*splat", (_req, _res, next) => {
    next(
      new ForbiddenException(
        "Public registration is disabled. Accounts are provisioned by institution administrators."
      )
    );
  });
  app2.all("/api/auth/*splat", authLimiter, (0, import_node3.toNodeHandler)(auth));
  app2.use(import_express9.default.json({ limit: "256kb" }));
  app2.use(import_express9.default.urlencoded({ extended: true, limit: "256kb" }));
  app2.use((0, import_cookie_parser.default)());
  app2.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  setupSwagger(app2);
  app2.use("/api/v1", apiLimiter, v1Routes);
  app2.use((_req, _res, next) => {
    next(new NotFoundException("Resource not found"));
  });
  app2.use(errorHandler);
  return app2;
};

// src/jobs/expiry-sweeper.job.ts
var sweeperInterval = null;
var startExpirySweeperJob = (intervalMs = 6e4) => {
  if (sweeperInterval) return;
  sweeperInterval = setInterval(async () => {
    try {
      const closedCount = await cbtService.sweepExpiredAttempts();
      if (closedCount > 0) {
        logger.info("Auto-submitted expired CBT exam attempts", { closedCount });
      }
    } catch (error) {
      logger.error("CBT expiry sweeper tick failed", {
        error: error.message
      });
    }
  }, intervalMs);
  sweeperInterval.unref();
};
var stopExpirySweeperJob = () => {
  if (sweeperInterval) {
    clearInterval(sweeperInterval);
    sweeperInterval = null;
  }
};

// src/index.ts
var app = createApp();
var server = app.listen(Env.PORT, () => {
  realtimeGateway.init(server);
  startExpirySweeperJob();
  logger.info("API listening", {
    port: Env.PORT,
    environment: Env.NODE_ENV,
    docsUrl: Env.NODE_ENV !== "production" || Env.ENABLE_SWAGGER ? `http://localhost:${Env.PORT}/docs` : "disabled"
  });
});
var shutdownSignals = ["SIGTERM", "SIGINT"];
var shuttingDown = false;
var shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("Shutting down API", { signal });
  stopExpirySweeperJob();
  try {
    await realtimeGateway.close();
  } catch (wsErr) {
    logger.error("Error closing WebSocket gateway", {
      error: wsErr.message
    });
  }
  server.close(async (error) => {
    try {
      await pool.end();
      logger.info("Database pool closed successfully");
    } catch (poolErr) {
      logger.error("Error closing database pool", {
        error: poolErr.message
      });
    }
    if (error) {
      logger.error("Shutdown failed", { error: error.message });
      process.exitCode = 1;
    } else {
      process.exitCode = 0;
    }
  });
};
shutdownSignals.forEach((signal) => process.once(signal, () => shutdown(signal)));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  app,
  server
});
//# sourceMappingURL=index.js.map