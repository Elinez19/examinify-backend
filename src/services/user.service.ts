import crypto from "crypto";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import Papa from "papaparse";
import { Request } from "express";
import { db } from "../db";
import {
  academicSessions,
  account,
  branches,
  classes,
  guardians,
  schools,
  staffProfiles,
  studentEnrollments,
  studentProfiles,
  user,
} from "../db/schema";
import { StaffCategory, UserRole } from "../db/schema/enums";
import { canProvisionRole } from "../config/permissions.config";
import { AuthenticatedUser } from "../types/express";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "../utils/app-error";
import { auditService } from "./audit.service";
import { emailService } from "./email.service";
import { preassignedClassesService } from "./preassigned-classes.service";
import { scopeService } from "./scope.service";
import { isGradeAllowedForSchoolLevel } from "../config/preassigned-classes.config";
import {
  CreateBranchMemberInput,
  CreateSchoolAdminInput,
  ImportCsvMembersInput,
} from "../validators/user.validator";

const mapRoleToStaffCategory = (role: UserRole): StaffCategory => {
  if (role === "super_admin" || role === "school_admin") return "admin";
  if (role === "non_academic_staff") return "non_academic";
  return "academic";
};

export const userService = {
  async getMe(actor: AuthenticatedUser) {
    const [dbUser] = await db
      .select({
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
        createdAt: user.createdAt,
      })
      .from(user)
      .where(and(eq(user.id, actor.id), isNull(user.deletedAt)))
      .limit(1);

    if (!dbUser) {
      throw new NotFoundException("User not found.");
    }

    const [branch] = dbUser.primaryBranchId
      ? await db.select().from(branches).where(eq(branches.id, dbUser.primaryBranchId)).limit(1)
      : [null];
    const [school] = dbUser.primarySchoolId
      ? await db.select().from(schools).where(eq(schools.id, dbUser.primarySchoolId)).limit(1)
      : [null];

    if (dbUser.role === "student") {
      const [profile] = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, dbUser.id))
        .limit(1);
      const studentGuardians = profile
        ? await db.select().from(guardians).where(eq(guardians.studentProfileId, profile.id))
        : [];
      return { ...dbUser, branch, school, studentProfile: profile ?? null, guardians: studentGuardians };
    }

    const [staff] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, dbUser.id))
      .limit(1);

    return { ...dbUser, branch, school, staffProfile: staff ?? null };
  },

  async createSchoolAdmin(
    actor: AuthenticatedUser,
    input: CreateSchoolAdminInput,
    req?: Request
  ) {
    if (!canProvisionRole(actor.role, "school_admin")) {
      throw new ForbiddenException("Only the Super Admin can create School Admin accounts.");
    }

    const [school] = await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.id, input.schoolId),
          eq(schools.branchId, input.branchId),
          eq(schools.isActive, true),
          isNull(schools.deletedAt)
        )
      )
      .limit(1);

    if (!school) {
      throw new BadRequestException("Selected school does not belong to the specified branch.");
    }

    const normalizedUsername = input.username.trim().toLowerCase();
    const normalizedEmail = input.email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(or(eq(user.email, normalizedEmail), eq(user.username, normalizedUsername)))
      .limit(1);

    if (existing) {
      throw new ConflictException("A user with this username or email already exists.");
    }

    const [existingStaff] = await db
      .select({ id: staffProfiles.id })
      .from(staffProfiles)
      .where(eq(staffProfiles.staffId, input.staffId))
      .limit(1);

    if (existingStaff) {
      throw new ConflictException("A staff member with this staffId already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const userId = crypto.randomUUID();

    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(user)
        .values({
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
          primarySchoolId: input.schoolId,
        })
        .returning();

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });

      const [profile] = await tx
        .insert(staffProfiles)
        .values({
          userId,
          staffId: input.staffId,
          staffCategory: "admin",
          title: input.title ?? "School Administrator",
          phone: input.phone,
          department: input.department ?? "Administration",
        })
        .returning();

      return { user: newUser, staffProfile: profile };
    });

    await preassignedClassesService.ensurePreassignedClassesForSchoolActiveSession(
      school.id,
      school.level
    );

    await auditService.log({
      action: "user.create.school_admin",
      entityType: "user",
      entityId: userId,
      branchId: input.branchId,
      schoolId: input.schoolId,
      metadata: { username: normalizedUsername, role: "school_admin", staffId: input.staffId },
      req,
    });

    await emailService
      .sendAccountProvisionedEmail({
        to: normalizedEmail,
        name: input.name,
        username: input.username.trim(),
        role: "school_admin",
      })
      .catch(() => undefined);

    return created;
  },

  async createBranchMember(
    actor: AuthenticatedUser,
    input: CreateBranchMemberInput,
    req?: Request
  ) {
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
      schoolId: targetSchoolId,
    });

    const [school] = await db
      .select()
      .from(schools)
      .where(
        and(
          eq(schools.id, targetSchoolId),
          eq(schools.branchId, targetBranchId),
          isNull(schools.deletedAt)
        )
      )
      .limit(1);

    if (!school) {
      throw new BadRequestException("Target school does not belong to the specified branch.");
    }

    if (
      input.role === "student" &&
      input.gradeLevel &&
      !isGradeAllowedForSchoolLevel(input.gradeLevel, school.level)
    ) {
      const expected =
        school.level === "primary"
          ? "Primary / Early Years (Playgroup – Grade 6)"
          : "Secondary (JSS 1 – SS 3)";
      throw new BadRequestException(
        `${school.name} is a ${school.level} school and only supports ${expected} grade levels.`
      );
    }

    const normalizedUsername = input.username.trim().toLowerCase();
    const normalizedEmail = input.email.trim().toLowerCase();

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(or(eq(user.email, normalizedEmail), eq(user.username, normalizedUsername)))
      .limit(1);

    if (existing) {
      throw new ConflictException("A user with this username or email already exists.");
    }

    const passwordHash = await hashPassword(input.password);
    const userId = crypto.randomUUID();

    const created = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(user)
        .values({
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
          primarySchoolId: targetSchoolId,
        })
        .returning();

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });

      if (input.role === "student") {
        const [studentProfile] = await tx
          .insert(studentProfiles)
          .values({
            userId,
            registrationNumber: input.registrationNumber!,
            gender: input.gender ?? "male",
            phone: input.phone,
            gradeLevel: input.gradeLevel!,
            department: input.department,
            targetExamTrack: input.targetExamTrack,
            targetExamYear: input.targetExamYear,
          })
          .returning();

        if (input.guardian) {
          await tx.insert(guardians).values({
            studentProfileId: studentProfile.id,
            fullName: input.guardian.fullName,
            relationship: input.guardian.relationship,
            phone: input.guardian.phone,
            email: input.guardian.email,
            address: input.guardian.address,
            isPrimary: true,
          });
        }

        if (input.classId) {
          const [cls] = await tx
            .select()
            .from(classes)
            .where(and(eq(classes.id, input.classId), eq(classes.schoolId, targetSchoolId)))
            .limit(1);

          if (!cls) {
            throw new BadRequestException("Target class not found in this school.");
          }

          let sessionId = input.sessionId ?? cls.sessionId;
          if (!sessionId) {
            const [activeSession] = await tx
              .select()
              .from(academicSessions)
              .where(eq(academicSessions.isActive, true))
              .limit(1);
            if (!activeSession) {
              throw new BadRequestException("No active academic session configured.");
            }
            sessionId = activeSession.id;
          }

          await tx.insert(studentEnrollments).values({
            studentProfileId: studentProfile.id,
            classId: cls.id,
            sessionId,
            isActive: true,
          });
        }

        return { user: newUser, studentProfile };
      }

      const [staffProfile] = await tx
        .insert(staffProfiles)
        .values({
          userId,
          staffId: input.staffId!,
          staffCategory: mapRoleToStaffCategory(input.role),
          title: input.title,
          phone: input.phone,
          department: input.department,
          qualifications: input.qualifications ?? [],
          specializations: input.specializations ?? [],
        })
        .returning();

      return { user: newUser, staffProfile };
    });

    await auditService.log({
      action: `user.create.${input.role}`,
      entityType: "user",
      entityId: userId,
      branchId: targetBranchId,
      schoolId: targetSchoolId,
      metadata: { username: normalizedUsername, role: input.role },
      req,
    });

    await emailService
      .sendAccountProvisionedEmail({
        to: normalizedEmail,
        name: input.name,
        username: input.username.trim(),
        role: input.role,
      })
      .catch(() => undefined);

    return created;
  },

  async importMembersFromCsv(
    actor: AuthenticatedUser,
    input: ImportCsvMembersInput,
    req?: Request
  ) {
    if (actor.role !== "school_admin") {
      throw new ForbiddenException("Only School Admins can bulk-import branch accounts.");
    }

    const parsed = Papa.parse<Record<string, string>>(input.csvContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      throw new BadRequestException("Unable to parse CSV file.", parsed.errors);
    }

    const results: Array<{ row: number; username?: string; status: "created" | "failed"; error?: string }> = [];

    for (let i = 0; i < parsed.data.length; i += 1) {
      const row = parsed.data[i];
      const rowNum = i + 2;
      try {
        const role = (row.role || "student").trim() as CreateBranchMemberInput["role"];
        const payload: CreateBranchMemberInput = {
          role,
          name: (row.name || "").trim(),
          username: (row.username || row.registrationNumber || row.staffId || "").trim(),
          email: (row.email || "").trim(),
          password: (row.password || input.defaultPassword || "Examinify@2026").trim(),
          registrationNumber: row.registrationNumber?.trim(),
          staffId: row.staffId?.trim(),
          gradeLevel: row.gradeLevel?.trim(),
          gender: (row.gender?.trim().toLowerCase() as "male" | "female") || "male",
          department: row.department?.trim(),
          title: row.title?.trim(),
          phone: row.phone?.trim(),
          classId: row.classId?.trim() || input.classId,
          sessionId: input.sessionId,
        };

        await this.createBranchMember(actor, payload, req);
        results.push({ row: rowNum, username: payload.username, status: "created" });
      } catch (err) {
        results.push({
          row: rowNum,
          username: row.username,
          status: "failed",
          error: (err as Error).message,
        });
      }
    }

    return {
      total: results.length,
      createdCount: results.filter((r) => r.status === "created").length,
      failedCount: results.filter((r) => r.status === "failed").length,
      results,
    };
  },

  async listDirectory(
    actor: AuthenticatedUser,
    filters: { role?: UserRole; search?: string; branchId?: string; schoolId?: string }
  ) {
    const conditions = [isNull(user.deletedAt)];

    if (actor.role !== "super_admin") {
      if (actor.primaryBranchId) {
        conditions.push(eq(user.primaryBranchId, actor.primaryBranchId));
      }
      if (actor.primarySchoolId) {
        conditions.push(eq(user.primarySchoolId, actor.primarySchoolId));
      }
    } else {
      if (filters.branchId) conditions.push(eq(user.primaryBranchId, filters.branchId));
      if (filters.schoolId) conditions.push(eq(user.primarySchoolId, filters.schoolId));
    }

    if (filters.role) {
      conditions.push(eq(user.role, filters.role));
    }

    if (filters.search) {
      const pattern = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(user.name, pattern),
          ilike(user.username, pattern),
          ilike(user.email, pattern)
        )!
      );
    }

    return db
      .select({
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
        primaryBranchId: user.primaryBranchId,
        primarySchoolId: user.primarySchoolId,
        createdAt: user.createdAt,
        staffProfileId: staffProfiles.id,
        staffId: staffProfiles.staffId,
        staffCategory: staffProfiles.staffCategory,
        title: staffProfiles.title,
        department: staffProfiles.department,
        phone: staffProfiles.phone,
        studentProfileId: studentProfiles.id,
        registrationNumber: studentProfiles.registrationNumber,
      })
      .from(user)
      .leftJoin(staffProfiles, eq(staffProfiles.userId, user.id))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, user.id))
      .where(and(...conditions))
      .orderBy(desc(user.createdAt))
      .limit(200);
  },

  async updateUserRole(
    actor: AuthenticatedUser,
    targetUserId: string,
    nextRole: "school_admin" | "examiner" | "teacher" | "non_academic_staff",
    reason?: string,
    req?: Request
  ) {
    if (actor.id === targetUserId) {
      throw new ForbiddenException("You cannot modify your own account role.");
    }

    const [target] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, targetUserId), isNull(user.deletedAt)))
      .limit(1);

    if (!target) {
      throw new NotFoundException("User not found.");
    }

    if (target.role === "super_admin") {
      throw new ForbiddenException("Super Admin role cannot be modified here.");
    }

    if (target.role === "student") {
      throw new BadRequestException("Student accounts cannot be reassigned to staff roles.");
    }

    if (
      (nextRole === "school_admin" || target.role === "school_admin") &&
      actor.role !== "super_admin"
    ) {
      throw new ForbiddenException(
        "Only a Super Admin can assign or change the School Admin role."
      );
    }

    scopeService.assertBranchSchoolScope(actor, {
      branchId: target.primaryBranchId,
      schoolId: target.primarySchoolId,
    });

    const nextCategory = mapRoleToStaffCategory(nextRole);

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(user)
        .set({
          role: nextRole,
          updatedAt: new Date(),
        })
        .where(eq(user.id, targetUserId))
        .returning({
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
        });

      await tx
        .update(staffProfiles)
        .set({
          staffCategory: nextCategory,
          updatedAt: new Date(),
        })
        .where(eq(staffProfiles.userId, targetUserId));

      return row;
    });

    await auditService.log({
      action: "user.role.update",
      entityType: "user",
      entityId: targetUserId,
      branchId: target.primaryBranchId,
      schoolId: target.primarySchoolId,
      metadata: {
        previousRole: target.role,
        nextRole,
        staffCategory: nextCategory,
        reason,
      },
      req,
    });

    return { ...updated, staffCategory: nextCategory };
  },

  async updateUserStatus(
    actor: AuthenticatedUser,
    targetUserId: string,
    status: "pending" | "active" | "suspended",
    reason?: string,
    req?: Request
  ) {
    const [target] = await db
      .select()
      .from(user)
      .where(and(eq(user.id, targetUserId), isNull(user.deletedAt)))
      .limit(1);

    if (!target) {
      throw new NotFoundException("User not found.");
    }

    if (target.role === "super_admin") {
      throw new ForbiddenException("Super Admin account status cannot be modified here.");
    }

    scopeService.assertBranchSchoolScope(actor, {
      branchId: target.primaryBranchId,
      schoolId: target.primarySchoolId,
    });

    const [updated] = await db
      .update(user)
      .set({
        status,
        banned: status === "suspended",
        banReason: status === "suspended" ? reason ?? "Suspended by administrator" : null,
        updatedAt: new Date(),
      })
      .where(eq(user.id, targetUserId))
      .returning({
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
      });

    await auditService.log({
      action: "user.status.update",
      entityType: "user",
      entityId: targetUserId,
      branchId: target.primaryBranchId,
      schoolId: target.primarySchoolId,
      metadata: { status, reason },
      req,
    });

    return updated;
  },

  async completeFirstLoginPasswordChange(
    actor: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
    req?: Request
  ) {
    const [cred] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, actor.id), eq(account.providerId, "credential")))
      .limit(1);

    if (!cred?.password) {
      throw new BadRequestException("Password credential not found for this account.");
    }

    const valid = await verifyPassword({ hash: cred.password, password: currentPassword });
    if (!valid) {
      throw new BadRequestException("Current password is incorrect.");
    }

    const newHash = await hashPassword(newPassword);

    await db.transaction(async (tx) => {
      await tx
        .update(account)
        .set({ password: newHash, updatedAt: new Date() })
        .where(eq(account.id, cred.id));

      await tx
        .update(user)
        .set({ mustChangePassword: false, updatedAt: new Date() })
        .where(eq(user.id, actor.id));
    });

    await auditService.log({
      action: "user.password.first_login_changed",
      entityType: "user",
      entityId: actor.id,
      req,
    });

    return { updated: true };
  },
};
