import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "school_admin",
  "examiner",
  "teacher",
  "non_academic_staff",
  "student",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "pending",
  "active",
  "suspended",
]);

export const schoolLevelEnum = pgEnum("school_level", ["primary", "secondary"]);

export const staffCategoryEnum = pgEnum("staff_category", [
  "admin",
  "academic",
  "non_academic",
]);

export const assessmentTypeEnum = pgEnum("assessment_type", [
  "CA1",
  "CA2",
  "CA3",
  "CA4",
  "Exam",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "mcq",
  "fill_blanks",
  "theory",
]);

export const difficultyEnum = pgEnum("difficulty", [
  "basic",
  "intermediate",
  "advanced",
]);

export const subjectCategoryEnum = pgEnum("subject_category", [
  "Core",
  "Elective",
  "STEM",
  "Humanities",
  "Vocational",
]);

export const examStatusEnum = pgEnum("exam_status", [
  "draft",
  "pending_approval",
  "scheduled",
  "live",
  "completed",
  "published",
]);

export const cbtSessionTypeEnum = pgEnum("cbt_session_type", [
  "single_subject_ca",
  "two_subject_daily",
  "national_jamb_mock",
  "term_exam",
]);

export const attemptStatusEnum = pgEnum("attempt_status", [
  "in_progress",
  "submitted",
  "auto_submitted",
  "flagged",
  "graded",
]);

export const proctoringEventTypeEnum = pgEnum("proctoring_event_type", [
  "tab_switch",
  "fullscreen_exit",
  "window_blur",
  "copy_attempt",
  "session_conflict",
  "force_submit",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "present",
  "absent",
  "late",
  "excused",
]);

export const genderEnum = pgEnum("gender", ["male", "female"]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type AccountStatus = (typeof accountStatusEnum.enumValues)[number];
export type SchoolLevel = (typeof schoolLevelEnum.enumValues)[number];
export type StaffCategory = (typeof staffCategoryEnum.enumValues)[number];
export type AssessmentType = (typeof assessmentTypeEnum.enumValues)[number];
export type QuestionType = (typeof questionTypeEnum.enumValues)[number];
export type DifficultyLevel = (typeof difficultyEnum.enumValues)[number];
export type SubjectCategory = (typeof subjectCategoryEnum.enumValues)[number];
export type ExamStatus = (typeof examStatusEnum.enumValues)[number];
export type CbtSessionType = (typeof cbtSessionTypeEnum.enumValues)[number];
export type AttemptStatus = (typeof attemptStatusEnum.enumValues)[number];
export type ProctoringEventType = (typeof proctoringEventTypeEnum.enumValues)[number];
export type AttendanceStatus = (typeof attendanceStatusEnum.enumValues)[number];
export type Gender = (typeof genderEnum.enumValues)[number];
