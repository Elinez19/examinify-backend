import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { attemptStatusEnum, proctoringEventTypeEnum } from "./enums";
import { academicSessions, terms } from "./institution.schema";
import { classes, studentProfiles, subjects } from "./people.schema";
import { examQuestionSnapshots, exams } from "./exam.schema";
import { user } from "./auth.schema";

export interface RubricScoreEntry {
  criterionId: string;
  score: number;
  comment?: string;
}

export const examAttempts = pgTable(
  "exam_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "restrict" }),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    lockedSessionId: text("locked_session_id"),
    status: attemptStatusEnum("status").notNull().default("in_progress"),
    questionOrder: jsonb("question_order").$type<string[]>().notNull().default([]),
    optionOrders: jsonb("option_orders").$type<Record<string, string[]>>().notNull().default({}),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    serverExpiresAt: timestamp("server_expires_at").notNull(),
    submittedAt: timestamp("submitted_at"),
    infractionCount: integer("infraction_count").notNull().default(0),
    aggregateScore: numeric("aggregate_score", { precision: 7, scale: 2 }),
    maxPossibleScore: numeric("max_possible_score", { precision: 7, scale: 2 }),
    aggregatePercentage: numeric("aggregate_percentage", { precision: 5, scale: 2 }),
    gradeLetter: text("grade_letter"),
    performanceRemark: text("performance_remark"),
    isPassed: boolean("is_passed"),
    resultsReleased: boolean("results_released").notNull().default(false),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("exam_attempts_exam_student_uniq").on(table.examId, table.studentProfileId),
    index("exam_attempts_status_expires_idx").on(table.status, table.serverExpiresAt),
    index("exam_attempts_user_idx").on(table.userId),
  ]
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => examAttempts.id, { onDelete: "cascade" }),
    snapshotQuestionId: uuid("snapshot_question_id")
      .notNull()
      .references(() => examQuestionSnapshots.id, { onDelete: "cascade" }),
    selectedOptionId: text("selected_option_id"),
    textResponse: text("text_response"),
    isFlagged: boolean("is_flagged").notNull().default(false),
    isVisited: boolean("is_visited").notNull().default(true),
    isCorrect: boolean("is_correct"),
    awardedPoints: numeric("awarded_points", { precision: 6, scale: 2 }),
    rubricBreakdown: jsonb("rubric_breakdown").$type<RubricScoreEntry[]>(),
    graderFeedback: text("grader_feedback"),
    gradedBy: text("graded_by").references(() => user.id, { onDelete: "set null" }),
    gradedAt: timestamp("graded_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attempt_answers_attempt_question_uniq").on(
      table.attemptId,
      table.snapshotQuestionId
    ),
    index("attempt_answers_attempt_idx").on(table.attemptId),
  ]
);

export const proctoringEvents = pgTable(
  "proctoring_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => examAttempts.id, { onDelete: "cascade" }),
    eventType: proctoringEventTypeEnum("event_type").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
  },
  (table) => [index("proctoring_events_attempt_idx").on(table.attemptId)]
);

export const attemptSubjectScores = pgTable(
  "attempt_subject_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => examAttempts.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    totalQuestions: integer("total_questions").notNull(),
    attemptedQuestions: integer("attempted_questions").notNull(),
    correctAnswers: integer("correct_answers").notNull(),
    rawScore: numeric("raw_score", { precision: 7, scale: 2 }).notNull(),
    maxScore: numeric("max_score", { precision: 7, scale: 2 }).notNull(),
    percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
    gradeLetter: text("grade_letter").notNull(),
    timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attempt_subject_scores_uniq").on(table.attemptId, table.subjectId),
  ]
);

export const gradebookRecords = pgTable(
  "gradebook_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "restrict" }),
    ca1Score: numeric("ca1_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    ca2Score: numeric("ca2_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    ca3Score: numeric("ca3_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    ca4Score: numeric("ca4_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    totalCaScore: numeric("total_ca_score", { precision: 5, scale: 2 }).notNull().default("0.00"),
    terminalExamScore: numeric("terminal_exam_score", { precision: 5, scale: 2 })
      .notNull()
      .default("0.00"),
    grandTotal: numeric("grand_total", { precision: 5, scale: 2 }).notNull().default("0.00"),
    gradeLetter: text("grade_letter").notNull().default("F9"),
    remarks: text("remarks").notNull().default("Fail"),
    isAtRisk: boolean("is_at_risk").notNull().default(false),
    isPublished: boolean("is_published").notNull().default(false),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("gradebook_student_subject_term_uniq").on(
      table.studentProfileId,
      table.subjectId,
      table.termId
    ),
    index("gradebook_class_term_idx").on(table.classId, table.termId),
  ]
);
