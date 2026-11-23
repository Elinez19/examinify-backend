import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(64, "Username must be at most 64 characters")
  .regex(/^[a-zA-Z0-9._/-]+$/, "Username contains invalid characters");

export const createSchoolAdminSchema = z.object({
  name: z.string().trim().min(2).max(120),
  username: usernameSchema,
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  branchId: z.string().uuid(),
  schoolId: z.string().uuid(),
  staffId: z.string().trim().min(2).max(64),
  title: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(32).optional(),
  department: z.string().trim().max(100).optional(),
});

const guardianSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  relationship: z.string().trim().min(2).max(64),
  phone: z.string().trim().min(6).max(32),
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(255).optional(),
});

export const createBranchMemberSchema = z
  .object({
    role: z.enum(["examiner", "teacher", "non_academic_staff", "student"]),
    name: z.string().trim().min(2).max(120),
    username: usernameSchema,
    email: z.string().trim().email(),
    password: z.string().min(8).max(128),
    branchId: z.string().uuid().optional(),
    schoolId: z.string().uuid().optional(),
    // Student-specific fields
    registrationNumber: z.string().trim().min(2).max(64).optional(),
    gender: z.enum(["male", "female"]).optional(),
    gradeLevel: z.string().trim().max(64).optional(),
    classId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    targetExamTrack: z.string().trim().max(100).optional(),
    targetExamYear: z.string().trim().max(16).optional(),
    guardian: guardianSchema.optional(),
    // Staff-specific fields
    staffId: z.string().trim().min(2).max(64).optional(),
    title: z.string().trim().max(100).optional(),
    phone: z.string().trim().max(32).optional(),
    department: z.string().trim().max(100).optional(),
    qualifications: z.array(z.string().trim()).optional(),
    specializations: z.array(z.string().trim()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "student") {
      if (!data.registrationNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["registrationNumber"],
          message: "registrationNumber is required when creating a student account",
        });
      }
      if (!data.gradeLevel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gradeLevel"],
          message: "gradeLevel is required when creating a student account",
        });
      }
    } else if (!data.staffId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["staffId"],
        message: "staffId is required when creating a staff account",
      });
    }
  });

export const importCsvMembersSchema = z.object({
  csvContent: z.string().min(10, "CSV content is required"),
  defaultPassword: z.string().min(8).max(128).optional(),
  classId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["pending", "active", "suspended"]),
  reason: z.string().trim().max(255).optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(["school_admin", "examiner", "teacher", "non_academic_staff"]),
  reason: z.string().trim().max(255).optional(),
});

export const completeFirstLoginSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

export type CreateSchoolAdminInput = z.infer<typeof createSchoolAdminSchema>;
export type CreateBranchMemberInput = z.infer<typeof createBranchMemberSchema>;
export type ImportCsvMembersInput = z.infer<typeof importCsvMembersSchema>;
