import { relations } from "drizzle-orm";
import { account, session, twoFactor, user } from "./auth.schema";
import {
  academicSessions,
  branches,
  schoolAssessmentConfigs,
  schools,
  terms,
} from "./institution.schema";
import {
  attendanceRecords,
  classes,
  guardians,
  staffProfiles,
  studentEnrollments,
  studentProfiles,
  subjects,
  teacherAssignments,
} from "./people.schema";
import {
  examQuestionLinks,
  examQuestionSnapshots,
  exams,
  examSections,
  examTargetClasses,
  questionBankItems,
} from "./exam.schema";
import {
  attemptAnswers,
  attemptSubjectScores,
  examAttempts,
  gradebookRecords,
  proctoringEvents,
} from "./cbt.schema";
import { auditLogs } from "./audit.schema";

export const branchesRelations = relations(branches, ({ many }) => ({
  schools: many(schools),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  branch: one(branches, { fields: [schools.branchId], references: [branches.id] }),
  classes: many(classes),
  subjects: many(subjects),
  assessmentConfigs: many(schoolAssessmentConfigs),
}));

export const academicSessionsRelations = relations(academicSessions, ({ many }) => ({
  terms: many(terms),
  classes: many(classes),
}));

export const termsRelations = relations(terms, ({ one }) => ({
  session: one(academicSessions, {
    fields: [terms.sessionId],
    references: [academicSessions.id],
  }),
}));

export const userRelations = relations(user, ({ one, many }) => ({
  primaryBranch: one(branches, {
    fields: [user.primaryBranchId],
    references: [branches.id],
  }),
  primarySchool: one(schools, {
    fields: [user.primarySchoolId],
    references: [schools.id],
  }),
  studentProfile: one(studentProfiles, {
    fields: [user.id],
    references: [studentProfiles.userId],
  }),
  staffProfile: one(staffProfiles, {
    fields: [user.id],
    references: [staffProfiles.userId],
  }),
  sessions: many(session),
  accounts: many(account),
  twoFactors: many(twoFactor),
  auditLogs: many(auditLogs),
}));

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(user, { fields: [studentProfiles.userId], references: [user.id] }),
  guardians: many(guardians),
  enrollments: many(studentEnrollments),
  attempts: many(examAttempts),
  gradebookRecords: many(gradebookRecords),
  attendanceRecords: many(attendanceRecords),
}));

export const guardiansRelations = relations(guardians, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [guardians.studentProfileId],
    references: [studentProfiles.id],
  }),
}));

export const staffProfilesRelations = relations(staffProfiles, ({ one, many }) => ({
  user: one(user, { fields: [staffProfiles.userId], references: [user.id] }),
  assignments: many(teacherAssignments),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  school: one(schools, { fields: [classes.schoolId], references: [schools.id] }),
  session: one(academicSessions, {
    fields: [classes.sessionId],
    references: [academicSessions.id],
  }),
  formMaster: one(user, { fields: [classes.formMasterId], references: [user.id] }),
  enrollments: many(studentEnrollments),
  teacherAssignments: many(teacherAssignments),
}));

export const studentEnrollmentsRelations = relations(studentEnrollments, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [studentEnrollments.studentProfileId],
    references: [studentProfiles.id],
  }),
  class: one(classes, { fields: [studentEnrollments.classId], references: [classes.id] }),
  session: one(academicSessions, {
    fields: [studentEnrollments.sessionId],
    references: [academicSessions.id],
  }),
}));

export const teacherAssignmentsRelations = relations(teacherAssignments, ({ one }) => ({
  staffProfile: one(staffProfiles, {
    fields: [teacherAssignments.staffProfileId],
    references: [staffProfiles.id],
  }),
  branch: one(branches, {
    fields: [teacherAssignments.branchId],
    references: [branches.id],
  }),
  school: one(schools, {
    fields: [teacherAssignments.schoolId],
    references: [schools.id],
  }),
  class: one(classes, { fields: [teacherAssignments.classId], references: [classes.id] }),
  subject: one(subjects, {
    fields: [teacherAssignments.subjectId],
    references: [subjects.id],
  }),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  branch: one(branches, { fields: [exams.branchId], references: [branches.id] }),
  school: one(schools, { fields: [exams.schoolId], references: [schools.id] }),
  session: one(academicSessions, {
    fields: [exams.sessionId],
    references: [academicSessions.id],
  }),
  term: one(terms, { fields: [exams.termId], references: [terms.id] }),
  creator: one(user, { fields: [exams.createdBy], references: [user.id] }),
  targetClasses: many(examTargetClasses),
  sections: many(examSections),
  questionLinks: many(examQuestionLinks),
  snapshots: many(examQuestionSnapshots),
  attempts: many(examAttempts),
}));

export const examSectionsRelations = relations(examSections, ({ one, many }) => ({
  exam: one(exams, { fields: [examSections.examId], references: [exams.id] }),
  subject: one(subjects, { fields: [examSections.subjectId], references: [subjects.id] }),
  snapshots: many(examQuestionSnapshots),
}));

export const examAttemptsRelations = relations(examAttempts, ({ one, many }) => ({
  exam: one(exams, { fields: [examAttempts.examId], references: [exams.id] }),
  studentProfile: one(studentProfiles, {
    fields: [examAttempts.studentProfileId],
    references: [studentProfiles.id],
  }),
  answers: many(attemptAnswers),
  proctoringEvents: many(proctoringEvents),
  subjectScores: many(attemptSubjectScores),
}));

export const attemptAnswersRelations = relations(attemptAnswers, ({ one }) => ({
  attempt: one(examAttempts, {
    fields: [attemptAnswers.attemptId],
    references: [examAttempts.id],
  }),
  snapshotQuestion: one(examQuestionSnapshots, {
    fields: [attemptAnswers.snapshotQuestionId],
    references: [examQuestionSnapshots.id],
  }),
}));

export const questionBankItemsRelations = relations(questionBankItems, ({ one }) => ({
  subject: one(subjects, {
    fields: [questionBankItems.subjectId],
    references: [subjects.id],
  }),
  creator: one(user, { fields: [questionBankItems.createdBy], references: [user.id] }),
}));
