import { Env } from "../config/env.config";
import { ErrorCodes } from "../utils/app-error";

export const getOpenApiSpec = (serverUrl?: string) => {
  const currentServer = serverUrl || Env.BETTER_AUTH_URL;

  return {
    openapi: "3.0.3",
    info: {
      title: "Examinify CBT Platform API",
      version: "2.0.0",
      description:
        "Production API for the Examinify multi-branch (Wuse, Guzape, Gwarinpa, Wuye) Primary & Secondary CBT Exam Management Platform.\n\n" +
        "### Security & Auth Model\n" +
        "- **Username + Password Only** (No Google OAuth, No public self-signup).\n" +
        "- **Strict Provisioning**: `super_admin` creates `school_admin`; `school_admin` creates `examiner`, `teacher`, `non_academic_staff`, and `student`.\n" +
        "- **Mandatory 2FA**: Enforced for `super_admin` and `school_admin` accounts.\n" +
        "- **Server-Authoritative CBT**: Single-session lock, server timers, Access PIN verification, infraction auto-submit, and zero answer-key leakage.",
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
      { name: "Gradebook" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Liveness check",
          responses: { "200": { description: "Healthy" } },
        },
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
                    password: { type: "string", format: "password" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Authenticated with HTTP-only session cookie" },
            "401": { description: "Invalid credentials" },
            "429": { description: "Rate limited" },
          },
        },
      },
      "/api/auth/sign-out": {
        post: {
          tags: ["Auth (Better Auth)"],
          summary: "Sign out and revoke session",
          responses: { "200": { description: "Signed out" } },
        },
      },
      "/api/auth/get-session": {
        get: {
          tags: ["Auth (Better Auth)"],
          summary: "Get active session",
          responses: { "200": { description: "Active session" } },
        },
      },
      "/api/v1/users/me": {
        get: {
          tags: ["Users & Provisioning"],
          summary: "Get authenticated user profile, branch/school scope, and role profile",
          responses: { "200": { description: "User profile" } },
        },
      },
      "/api/v1/users/school-admins": {
        post: {
          tags: ["Users & Provisioning"],
          summary: "Create a School Admin account (Super Admin only)",
          responses: { "201": { description: "School Admin created" } },
        },
      },
      "/api/v1/users/members": {
        post: {
          tags: ["Users & Provisioning"],
          summary: "Create Examiner, Teacher, Non-Academic Staff, or Student (School Admin only)",
          responses: { "201": { description: "Branch member created" } },
        },
      },
      "/api/v1/users/import-csv": {
        post: {
          tags: ["Users & Provisioning"],
          summary: "Bulk CSV import of branch accounts (School Admin only)",
          responses: { "200": { description: "Import summary" } },
        },
      },
      "/api/v1/users/directory": {
        get: {
          tags: ["Users & Provisioning"],
          summary: "Scoped school directory (Non-Academic Staff, School Admin, Super Admin)",
          responses: { "200": { description: "Directory list" } },
        },
      },
      "/api/v1/users/{userId}/status": {
        patch: {
          tags: ["Users & Provisioning"],
          summary: "Update scoped user account status (active, pending, suspended)",
          responses: { "200": { description: "Updated user status" } },
        },
      },
      "/api/v1/users/{userId}/role": {
        patch: {
          tags: ["Users & Provisioning"],
          summary: "Reassign scoped staff user role (school_admin, examiner, teacher, non_academic_staff)",
          responses: { "200": { description: "Updated staff role" } },
        },
      },
      "/api/v1/institution/branches": {
        get: { tags: ["Institution & Academics"], summary: "List campus branches", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Create branch (Super Admin)", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/institution/schools": {
        get: { tags: ["Institution & Academics"], summary: "List Primary/Secondary schools", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Create school (Super Admin)", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/institution/classes": {
        get: { tags: ["Institution & Academics"], summary: "List classes", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Create class", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/institution/classes/{classId}": {
        patch: { tags: ["Institution & Academics"], summary: "Update class arm details or assign/unassign form master", responses: { "200": { description: "Updated class" } } },
      },
      "/api/v1/institution/classes/{classId}/students": {
        get: { tags: ["Institution & Academics"], summary: "List actively enrolled students in a class", responses: { "200": { description: "Class student roster" } } },
      },
      "/api/v1/institution/teacher-assignments": {
        get: { tags: ["Institution & Academics"], summary: "List scoped teacher class/subject assignments", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Assign teacher to class/subject", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/institution/teacher-assignments/{assignmentId}": {
        delete: { tags: ["Institution & Academics"], summary: "Remove a teacher class/subject assignment", responses: { "200": { description: "Deleted" } } },
      },
      "/api/v1/institution/attendance": {
        get: { tags: ["Institution & Academics"], summary: "List attendance records", responses: { "200": { description: "OK" } } },
        post: { tags: ["Institution & Academics"], summary: "Record class attendance", responses: { "200": { description: "Saved" } } },
      },
      "/api/v1/media/upload-signature": {
        post: {
          tags: ["Media"],
          summary: "Generate signed Cloudinary upload parameters for avatars or STEM diagrams",
          responses: { "200": { description: "Signed upload params" } },
        },
      },
      "/api/v1/question-bank": {
        get: { tags: ["Question Bank & AI"], summary: "List question bank items", responses: { "200": { description: "OK" } } },
        post: { tags: ["Question Bank & AI"], summary: "Create question bank item", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/question-bank/ai-generate": {
        post: {
          tags: ["Question Bank & AI"],
          summary: "Generate draft curriculum questions via Gemini API (Teacher quota enforced)",
          responses: { "200": { description: "Generated draft questions" } },
        },
      },
      "/api/v1/exams": {
        get: { tags: ["Exams"], summary: "List scoped exams", responses: { "200": { description: "OK" } } },
        post: { tags: ["Exams"], summary: "Create draft exam with sections and target classes", responses: { "201": { description: "Created" } } },
      },
      "/api/v1/exams/{examId}": {
        get: { tags: ["Exams"], summary: "Get exam detail with sections and target classes", responses: { "200": { description: "OK" } } },
        patch: { tags: ["Exams"], summary: "Update draft exam settings or close a live/scheduled exam", responses: { "200": { description: "Updated exam" } } },
        delete: { tags: ["Exams"], summary: "Soft-delete draft or pending_approval exam", responses: { "200": { description: "Deleted" } } },
      },
      "/api/v1/exams/{examId}/publish": {
        post: {
          tags: ["Exams"],
          summary: "Publish CA1-CA4 directly or submit Terminal/Mock exam for Examiner/Admin approval",
          responses: { "200": { description: "Updated exam" } },
        },
      },
      "/api/v1/exams/{examId}/approve": {
        post: {
          tags: ["Exams"],
          summary: "Approve, freeze snapshots, and schedule/open exam (Examiner/School Admin)",
          responses: { "200": { description: "Approved exam" } },
        },
      },
      "/api/v1/exams/{examId}/release-results": {
        post: {
          tags: ["Exams"],
          summary: "Release finalized attempt results to students and optionally mark exam published",
          responses: { "200": { description: "Results released" } },
        },
      },
      "/api/v1/exams/{examId}/attempts": {
        get: {
          tags: ["CBT Attempts"],
          summary: "List live and submitted student attempts for staff monitoring & grading",
          responses: { "200": { description: "Attempt roster" } },
        },
      },
      "/api/v1/attempts/{attemptId}": {
        get: {
          tags: ["CBT Attempts"],
          summary: "Inspect attempt answers, snapshots, rubrics, and proctoring logs (Staff)",
          responses: { "200": { description: "Attempt script detail" } },
        },
      },
      "/api/v1/exams/{examId}/attempts/start": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Start or resume live CBT attempt (verifies PIN, binds session lock, strips answer keys)",
          responses: { "200": { description: "Sanitized CBT attempt payload" } },
        },
      },
      "/api/v1/attempts/{attemptId}/answers": {
        put: {
          tags: ["CBT Attempts"],
          summary: "Auto-save student answer with server timer & session-lock validation",
          responses: { "200": { description: "Answer saved" } },
        },
      },
      "/api/v1/attempts/{attemptId}/infractions": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Log proctoring infraction (auto-submits if maxInfractions reached)",
          responses: { "200": { description: "Infraction recorded" } },
        },
      },
      "/api/v1/attempts/{attemptId}/submit": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Submit attempt and run server-side auto-grading",
          responses: { "200": { description: "Submission result" } },
        },
      },
      "/api/v1/attempts/{attemptId}/force-submit": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Examiner/Admin force-submit a live student attempt",
          responses: { "200": { description: "Attempt force-submitted" } },
        },
      },
      "/api/v1/attempts/{attemptId}/unlock-session": {
        post: {
          tags: ["CBT Attempts"],
          summary: "Examiner/Admin unlocks frozen student session lock",
          responses: { "200": { description: "Session unlocked" } },
        },
      },
      "/api/v1/gradebook": {
        get: { tags: ["Gradebook"], summary: "List WAEC A1-F9 term gradebook records", responses: { "200": { description: "OK" } } },
        put: { tags: ["Gradebook"], summary: "Upsert CA1-CA4 + Exam gradebook record", responses: { "200": { description: "Saved" } } },
      },
      "/api/v1/gradebook/export": {
        get: { tags: ["Gradebook"], summary: "Export class term gradebook as CSV", responses: { "200": { description: "CSV file" } } },
      },
      "/api/v1/gradebook/publish": {
        post: { tags: ["Gradebook"], summary: "Publish or unpublish class term gradebook records to students", responses: { "200": { description: "Publish summary" } } },
      },
    },
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
      schemas: {
        ErrorEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            errorCode: { type: "string", enum: Object.values(ErrorCodes) },
            message: { type: "string" },
          },
        },
      },
    },
  };
};
