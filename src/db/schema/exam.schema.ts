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
import {
  assessmentTypeEnum,
  cbtSessionTypeEnum,
  difficultyEnum,
  examStatusEnum,
  questionTypeEnum,
  schoolLevelEnum,
} from "./enums";
import { academicSessions, branches, schools, terms } from "./institution.schema";
import { classes, subjects } from "./people.schema";
import { user } from "./auth.schema";

export interface QuestionOptionItem {
  id: string;
  label: string;
  text: string;
}

export interface QuestionRubricCriterion {
  id: string;
  criterion: string;
  weight: number; // 0..1 summing to 1.0
}

export const questionBankItems = pgTable(
  "question_bank_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    schoolLevel: schoolLevelEnum("school_level").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    contextSnippet: text("context_snippet"),
    imageUrl: text("image_url"),
    imageCaption: text("image_caption"),
    options: jsonb("options").$type<QuestionOptionItem[]>(),
    correctOptionId: text("correct_option_id"),
    shortAnswer: text("short_answer"),
    acceptedAnswers: jsonb("accepted_answers").$type<string[]>(),
    theoryAnswer: text("theory_answer"),
    rubrics: jsonb("rubrics").$type<QuestionRubricCriterion[]>(),
    points: numeric("points", { precision: 6, scale: 2 }).notNull().default("1.00"),
    explanation: text("explanation"),
    difficulty: difficultyEnum("difficulty").notNull().default("intermediate"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isAiGenerated: boolean("is_ai_generated").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("question_bank_subject_idx").on(table.subjectId),
    index("question_bank_branch_idx").on(table.branchId),
    index("question_bank_created_by_idx").on(table.createdBy),
  ]
);

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    schoolLevel: schoolLevelEnum("school_level").notNull(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "restrict" }),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    approvedBy: text("approved_by").references(() => user.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at"),
    sessionType: cbtSessionTypeEnum("session_type")
      .notNull()
      .default("single_subject_ca"),
    assessmentType: assessmentTypeEnum("assessment_type").notNull().default("CA1"),
    status: examStatusEnum("status").notNull().default("draft"),
    instructions: jsonb("instructions").$type<string[]>().notNull().default([]),
    durationMinutes: integer("duration_minutes").notNull(),
    passingScore: numeric("passing_score", { precision: 5, scale: 2 })
      .notNull()
      .default("50.00"),
    scheduledAt: timestamp("scheduled_at"),
    endsAt: timestamp("ends_at"),
    accessPinHash: text("access_pin_hash"),
    // CBT Runner Controls
    allowCalculator: boolean("allow_calculator").notNull().default(false),
    shuffleQuestions: boolean("shuffle_questions").notNull().default(true),
    shuffleOptions: boolean("shuffle_options").notNull().default(true),
    allowBackwardNavigation: boolean("allow_backward_navigation").notNull().default(true),
    strictProctoring: boolean("strict_proctoring").notNull().default(true),
    maxInfractions: integer("max_infractions").notNull().default(3),
    maxTabSwitches: integer("max_tab_switches").notNull().default(3),
    autoPublishResults: boolean("auto_publish_results").notNull().default(false),
    showStudentFeedback: boolean("show_student_feedback").notNull().default(true),
    showCorrectAnswers: boolean("show_correct_answers").notNull().default(false),
    enableLiveMonitoring: boolean("enable_live_monitoring").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("exams_branch_school_idx").on(table.branchId, table.schoolId),
    index("exams_status_idx").on(table.status),
    index("exams_term_idx").on(table.termId),
  ]
);

export const examTargetClasses = pgTable(
  "exam_target_classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exam_target_classes_uniq").on(table.examId, table.classId),
    index("exam_target_classes_class_idx").on(table.classId),
  ]
);

export const examSections = pgTable(
  "exam_sections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    totalQuestions: integer("total_questions").notNull().default(0),
    maxScore: numeric("max_score", { precision: 6, scale: 2 }).notNull().default("0.00"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("exam_sections_exam_subject_uniq").on(table.examId, table.subjectId),
    index("exam_sections_exam_idx").on(table.examId),
  ]
);

export const examQuestionLinks = pgTable(
  "exam_question_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => examSections.id, { onDelete: "cascade" }),
    questionBankItemId: uuid("question_bank_item_id")
      .notNull()
      .references(() => questionBankItems.id, { onDelete: "restrict" }),
    orderIndex: integer("order_index").notNull().default(0),
    pointsOverride: numeric("points_override", { precision: 6, scale: 2 }),
  },
  (table) => [
    uniqueIndex("exam_question_links_uniq").on(table.examId, table.questionBankItemId),
    index("exam_question_links_section_idx").on(table.sectionId),
  ]
);

export const examQuestionSnapshots = pgTable(
  "exam_question_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => examSections.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "restrict" }),
    sourceQuestionId: uuid("source_question_id").references(() => questionBankItems.id, {
      onDelete: "set null",
    }),
    questionNumber: integer("question_number").notNull(),
    type: questionTypeEnum("type").notNull(),
    prompt: text("prompt").notNull(),
    contextSnippet: text("context_snippet"),
    imageUrl: text("image_url"),
    imageCaption: text("image_caption"),
    options: jsonb("options").$type<QuestionOptionItem[]>(),
    correctOptionId: text("correct_option_id"),
    shortAnswer: text("short_answer"),
    acceptedAnswers: jsonb("accepted_answers").$type<string[]>(),
    theoryAnswer: text("theory_answer"),
    rubrics: jsonb("rubrics").$type<QuestionRubricCriterion[]>(),
    points: numeric("points", { precision: 6, scale: 2 }).notNull().default("1.00"),
    explanation: text("explanation"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("exam_question_snapshots_exam_idx").on(table.examId),
    index("exam_question_snapshots_section_idx").on(table.sectionId),
  ]
);
