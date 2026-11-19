import {
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  attendanceStatusEnum,
  genderEnum,
  schoolLevelEnum,
  staffCategoryEnum,
  subjectCategoryEnum,
} from "./enums";
import { academicSessions, branches, schools, terms } from "./institution.schema";
import { user } from "./auth.schema";

export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    name: text("name").notNull(), // e.g. "SS 1 Explorers", "Grade 4 Diamond"
    code: text("code").notNull(), // e.g. "SS1-EXP", "G4-DIA"
    gradeLevel: text("grade_level").notNull(), // e.g. "SS 1", "Grade 4"
    department: text("department"), // Science | Arts | Commercial (Secondary)
    room: text("room"),
    formMasterId: text("form_master_id").references(() => user.id, {
      onDelete: "set null",
    }),
    isPrimarySelfContained: boolean("is_primary_self_contained").notNull().default(false),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("classes_school_session_code_uniq").on(
      table.schoolId,
      table.sessionId,
      table.code
    ),
    index("classes_school_idx").on(table.schoolId),
  ]
);

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    schoolLevel: schoolLevelEnum("school_level").notNull(),
    name: text("name").notNull(), // e.g. "Mathematics", "English Language"
    code: text("code").notNull(), // e.g. "MTH", "ENG"
    category: subjectCategoryEnum("category").notNull().default("Core"),
    department: text("department"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("subjects_school_level_idx").on(table.schoolLevel),
    index("subjects_school_idx").on(table.schoolId),
  ]
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    registrationNumber: text("registration_number").notNull().unique(),
    gender: genderEnum("gender").notNull().default("male"),
    phone: text("phone"),
    gradeLevel: text("grade_level").notNull(),
    department: text("department"),
    targetExamTrack: text("target_exam_track"), // e.g. "WAEC / JAMB"
    targetExamYear: text("target_exam_year"),
    enrolledDate: date("enrolled_date").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("student_profiles_reg_no_idx").on(table.registrationNumber)]
);

export const guardians = pgTable(
  "guardians",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    relationship: text("relationship").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    address: text("address"),
    isPrimary: boolean("is_primary").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("guardians_student_idx").on(table.studentProfileId)]
);

export const studentEnrollments = pgTable(
  "student_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("student_enrollments_student_session_uniq").on(
      table.studentProfileId,
      table.sessionId
    ),
    index("student_enrollments_class_idx").on(table.classId),
  ]
);

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    staffId: text("staff_id").notNull().unique(),
    staffCategory: staffCategoryEnum("staff_category").notNull(),
    title: text("title"), // e.g. "Senior Mathematics Teacher", "Principal"
    phone: text("phone"),
    department: text("department"),
    qualifications: jsonb("qualifications").$type<string[]>().notNull().default([]),
    specializations: jsonb("specializations").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("staff_profiles_staff_id_idx").on(table.staffId)]
);

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    staffProfileId: uuid("staff_profile_id")
      .notNull()
      .references(() => staffProfiles.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id, {
      onDelete: "cascade",
    }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    isAllClassSubjects: boolean("is_all_class_subjects").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("teacher_assignments_staff_idx").on(table.staffProfileId),
    index("teacher_assignments_class_subject_idx").on(table.classId, table.subjectId),
  ]
);

export const attendanceRecords = pgTable(
  "attendance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    studentProfileId: uuid("student_profile_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "restrict" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull().default("present"),
    recordedBy: text("recorded_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("attendance_student_date_uniq").on(table.studentProfileId, table.date),
    index("attendance_class_date_idx").on(table.classId, table.date),
  ]
);
