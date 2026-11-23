import { z } from "zod";

export const createBranchSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(16).toUpperCase(),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(32).optional(),
});

export const createSchoolSchema = z.object({
  branchId: z.string().uuid(),
  level: z.enum(["primary", "secondary"]),
  name: z.string().trim().min(2).max(150),
});

export const createSessionSchema = z.object({
  label: z.string().trim().min(4).max(32),
  isActive: z.boolean().optional().default(false),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const createTermSchema = z.object({
  sessionId: z.string().uuid(),
  name: z.string().trim().min(2).max(64),
  orderIndex: z.number().int().min(1).max(4),
  isActive: z.boolean().optional().default(false),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const createClassSchema = z.object({
  schoolId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(32),
  gradeLevel: z.string().trim().min(2).max(64),
  department: z.string().trim().max(64).optional(),
  room: z.string().trim().max(64).optional(),
  formMasterId: z.string().min(1).optional(),
  isPrimarySelfContained: z.boolean().optional().default(false),
  description: z.string().trim().max(500).optional(),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  code: z.string().trim().min(2).max(32).optional(),
  gradeLevel: z.string().trim().min(2).max(64).optional(),
  department: z.string().trim().max(64).nullable().optional(),
  room: z.string().trim().max(64).nullable().optional(),
  formMasterId: z.string().min(1).nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const createSubjectSchema = z.object({
  schoolId: z.string().uuid().optional(),
  schoolLevel: z.enum(["primary", "secondary"]),
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(2).max(24).toUpperCase(),
  category: z.enum(["Core", "Elective", "STEM", "Humanities", "Vocational"]).default("Core"),
  department: z.string().trim().max(64).optional(),
});

export const createTeacherAssignmentSchema = z.object({
  staffProfileId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  schoolId: z.string().uuid().optional(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  isAllClassSubjects: z.boolean().optional().default(false),
});

export const recordAttendanceSchema = z.object({
  classId: z.string().uuid(),
  termId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  entries: z
    .array(
      z.object({
        studentProfileId: z.string().uuid(),
        status: z.enum(["present", "absent", "late", "excused"]),
        remarks: z.string().trim().max(255).optional(),
      })
    )
    .min(1),
});

export const mediaSignatureSchema = z.object({
  folder: z.enum(["examinify/avatars", "examinify/diagrams"]),
});
