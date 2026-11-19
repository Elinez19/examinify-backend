import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { assessmentTypeEnum, schoolLevelEnum } from "./enums";

export const branches = pgTable(
  "branches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(), // Wuse, Guzape, Gwarinpa, Wuye
    code: text("code").notNull().unique(), // WUS, GUZ, GWA, WUY
    address: text("address"),
    phone: text("phone"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [index("branches_is_active_idx").on(table.isActive)]
);

export const schools = pgTable(
  "schools",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    branchId: uuid("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "restrict" }),
    level: schoolLevelEnum("level").notNull(), // primary | secondary
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    uniqueIndex("schools_branch_level_uniq").on(table.branchId, table.level),
    index("schools_branch_idx").on(table.branchId),
  ]
);

export const academicSessions = pgTable("academic_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label").notNull().unique(), // e.g. "2025/2026"
  isActive: boolean("is_active").notNull().default(false),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const terms = pgTable(
  "terms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => academicSessions.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // "1st Term" | "2nd Term" | "3rd Term"
    orderIndex: integer("order_index").notNull(), // 1 | 2 | 3
    isActive: boolean("is_active").notNull().default(false),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("terms_session_order_uniq").on(table.sessionId, table.orderIndex),
    index("terms_session_idx").on(table.sessionId),
  ]
);

export const schoolAssessmentConfigs = pgTable(
  "school_assessment_configs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "cascade" }),
    assessmentType: assessmentTypeEnum("assessment_type").notNull(),
    label: text("label").notNull(),
    defaultMaxScore: integer("default_max_score").notNull(),
    weightPercentage: integer("weight_percentage").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("school_assessment_config_uniq").on(table.schoolId, table.assessmentType),
  ]
);
