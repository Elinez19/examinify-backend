import { and, desc, eq, isNull } from "drizzle-orm";
import { Request } from "express";
import { db } from "../db";
import {
  academicSessions,
  attendanceRecords,
  auditLogs,
  branches,
  classes,
  schools,
  staffProfiles,
  studentEnrollments,
  studentProfiles,
  subjects,
  teacherAssignments,
  terms,
  user,
} from "../db/schema";
import { AuthenticatedUser } from "../types/express";
import { BadRequestException, ForbiddenException, NotFoundException } from "../utils/app-error";
import { isGradeAllowedForSchoolLevel } from "../config/preassigned-classes.config";
import { auditService } from "./audit.service";
import { preassignedClassesService } from "./preassigned-classes.service";
import { scopeService } from "./scope.service";

export const institutionService = {
  async listBranches() {
    return db
      .select()
      .from(branches)
      .where(isNull(branches.deletedAt))
      .orderBy(branches.name);
  },

  async createBranch(
    input: { name: string; code: string; address?: string; phone?: string },
    req?: Request
  ) {
    const [created] = await db.insert(branches).values(input).returning();
    await auditService.log({
      action: "institution.branch.create",
      entityType: "branch",
      entityId: created.id,
      branchId: created.id,
      metadata: { name: created.name, code: created.code },
      req,
    });
    return created;
  },

  async listSchools(branchId?: string) {
    const conditions = [isNull(schools.deletedAt), eq(schools.isActive, true)];
    if (branchId) conditions.push(eq(schools.branchId, branchId));
    return db
      .select()
      .from(schools)
      .where(and(...conditions))
      .orderBy(schools.name);
  },

  async createSchool(
    input: { branchId: string; level: "primary" | "secondary"; name: string },
    req?: Request
  ) {
    const [created] = await db.insert(schools).values(input).returning();

    await preassignedClassesService.ensurePreassignedClassesForSchoolActiveSession(
      created.id,
      created.level
    );

    await auditService.log({
      action: "institution.school.create",
      entityType: "school",
      entityId: created.id,
      branchId: created.branchId,
      schoolId: created.id,
      metadata: { level: created.level, name: created.name },
      req,
    });
    return created;
  },

  async listAcademicSessions() {
    const allSessions = await db
      .select()
      .from(academicSessions)
      .orderBy(desc(academicSessions.createdAt));
    const allTerms = await db.select().from(terms).orderBy(terms.orderIndex);
    return allSessions.map((s) => ({
      ...s,
      terms: allTerms.filter((t) => t.sessionId === s.id),
    }));
  },

  async createAcademicSession(
    input: { label: string; isActive?: boolean; startsAt?: Date; endsAt?: Date },
    req?: Request
  ) {
    const created = await db.transaction(async (tx) => {
      if (input.isActive) {
        await tx.update(academicSessions).set({ isActive: false });
      }
      const [row] = await tx.insert(academicSessions).values(input).returning();
      return row;
    });

    await preassignedClassesService.ensurePreassignedClassesForAllSchoolsInSession(
      created.id
    );

    await auditService.log({
      action: "institution.session.create",
      entityType: "academic_session",
      entityId: created.id,
      metadata: { label: created.label, isActive: created.isActive },
      req,
    });
    return created;
  },

  async createTerm(
    input: {
      sessionId: string;
      name: string;
      orderIndex: number;
      isActive?: boolean;
      startsAt?: Date;
      endsAt?: Date;
    },
    req?: Request
  ) {
    const created = await db.transaction(async (tx) => {
      if (input.isActive) {
        await tx.update(terms).set({ isActive: false });
      }
      const [row] = await tx.insert(terms).values(input).returning();
      return row;
    });
    await auditService.log({
      action: "institution.term.create",
      entityType: "term",
      entityId: created.id,
      metadata: { name: created.name, sessionId: created.sessionId },
      req,
    });
    return created;
  },

  async listClasses(actor: AuthenticatedUser, schoolId?: string) {
    const conditions = [isNull(classes.deletedAt)];

    if (actor.role !== "super_admin") {
      if (!actor.primarySchoolId) {
        return [];
      }
      conditions.push(eq(classes.schoolId, actor.primarySchoolId));
    } else if (schoolId) {
      conditions.push(eq(classes.schoolId, schoolId));
    }

    return db
      .select()
      .from(classes)
      .where(and(...conditions))
      .orderBy(classes.name);
  },

  async createClass(
    actor: AuthenticatedUser,
    input: {
      schoolId?: string;
      sessionId: string;
      name: string;
      code: string;
      gradeLevel: string;
      department?: string;
      room?: string;
      formMasterId?: string;
      isPrimarySelfContained?: boolean;
      description?: string;
    },
    req?: Request
  ) {
    const targetSchoolId =
      actor.role === "super_admin"
        ? input.schoolId ?? actor.primarySchoolId
        : actor.primarySchoolId;
    if (!targetSchoolId) {
      throw new BadRequestException("schoolId is required.");
    }
    const school = await scopeService.assertSchoolAccess(actor, targetSchoolId);

    if (!isGradeAllowedForSchoolLevel(`${input.gradeLevel} ${input.name}`, school.level)) {
      const expected =
        school.level === "primary"
          ? "Primary / Early Years (Playgroup – Grade 6)"
          : "Secondary (JSS 1 – SS 3)";
      throw new BadRequestException(
        `${school.name} is a ${school.level} school and only supports ${expected} classes.`
      );
    }

    const [created] = await db
      .insert(classes)
      .values({
        ...input,
        schoolId: school.id,
        isPrimarySelfContained: school.level === "primary",
      })
      .returning();

    await auditService.log({
      action: "academics.class.create",
      entityType: "class",
      entityId: created.id,
      branchId: school.branchId,
      schoolId: school.id,
      metadata: { name: created.name, code: created.code },
      req,
    });
    return created;
  },

  async updateClass(
    actor: AuthenticatedUser,
    classId: string,
    input: {
      name?: string;
      code?: string;
      gradeLevel?: string;
      department?: string | null;
      room?: string | null;
      formMasterId?: string | null;
      description?: string | null;
    },
    req?: Request
  ) {
    const [existing] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("Class not found.");
    }

    const school = await scopeService.assertSchoolAccess(actor, existing.schoolId);

    if (input.name !== undefined || input.gradeLevel !== undefined) {
      const nextGrade = input.gradeLevel ?? existing.gradeLevel;
      const nextName = input.name ?? existing.name;
      if (!isGradeAllowedForSchoolLevel(`${nextGrade} ${nextName}`, school.level)) {
        const expected =
          school.level === "primary"
            ? "Primary / Early Years (Playgroup – Grade 6)"
            : "Secondary (JSS 1 – SS 3)";
        throw new BadRequestException(
          `${school.name} is a ${school.level} school and only supports ${expected} classes.`
        );
      }
    }

    if (input.formMasterId) {
      const [formMaster] = await db
        .select({
          id: user.id,
          role: user.role,
          primarySchoolId: user.primarySchoolId,
        })
        .from(user)
        .where(and(eq(user.id, input.formMasterId), isNull(user.deletedAt)))
        .limit(1);

      if (!formMaster) {
        throw new NotFoundException("Selected class teacher was not found.");
      }
      if (formMaster.role === "student") {
        throw new BadRequestException("A student cannot be assigned as a class teacher.");
      }
      if (
        formMaster.primarySchoolId &&
        formMaster.primarySchoolId !== existing.schoolId
      ) {
        throw new ForbiddenException(
          "Selected teacher does not belong to this class's school."
        );
      }
    }

    const updateFields: Partial<typeof classes.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) updateFields.name = input.name;
    if (input.code !== undefined) updateFields.code = input.code;
    if (input.gradeLevel !== undefined) updateFields.gradeLevel = input.gradeLevel;
    if (input.department !== undefined) updateFields.department = input.department;
    if (input.room !== undefined) updateFields.room = input.room;
    if (input.formMasterId !== undefined) updateFields.formMasterId = input.formMasterId;
    if (input.description !== undefined) updateFields.description = input.description;

    const [updated] = await db
      .update(classes)
      .set(updateFields)
      .where(eq(classes.id, classId))
      .returning();

    await auditService.log({
      action: "academics.class.update",
      entityType: "class",
      entityId: updated.id,
      branchId: school.branchId,
      schoolId: school.id,
      metadata: {
        formMasterId: updated.formMasterId,
        name: updated.name,
      },
      req,
    });

    return updated;
  },

  async listSubjects(schoolLevel?: "primary" | "secondary") {
    const conditions = [isNull(subjects.deletedAt)];
    if (schoolLevel) conditions.push(eq(subjects.schoolLevel, schoolLevel));
    return db
      .select()
      .from(subjects)
      .where(and(...conditions))
      .orderBy(subjects.name);
  },

  async createSubject(
    actor: AuthenticatedUser,
    input: {
      schoolId?: string;
      schoolLevel: "primary" | "secondary";
      name: string;
      code: string;
      category: "Core" | "Elective" | "STEM" | "Humanities" | "Vocational";
      department?: string;
    },
    req?: Request
  ) {
    const targetSchoolId = input.schoolId ?? actor.primarySchoolId ?? undefined;
    if (targetSchoolId) {
      await scopeService.assertSchoolAccess(actor, targetSchoolId);
    }

    const [created] = await db
      .insert(subjects)
      .values({
        ...input,
        schoolId: targetSchoolId ?? null,
      })
      .returning();

    await auditService.log({
      action: "academics.subject.create",
      entityType: "subject",
      entityId: created.id,
      schoolId: targetSchoolId ?? null,
      metadata: { name: created.name, code: created.code, schoolLevel: created.schoolLevel },
      req,
    });
    return created;
  },

  async createTeacherAssignment(
    actor: AuthenticatedUser,
    input: {
      staffProfileId: string;
      branchId?: string;
      schoolId?: string;
      classId: string;
      subjectId?: string;
      sessionId: string;
      isAllClassSubjects?: boolean;
    },
    req?: Request
  ) {
    const targetSchoolId = input.schoolId ?? actor.primarySchoolId;
    if (!targetSchoolId) {
      throw new BadRequestException("schoolId is required.");
    }
    const school = await scopeService.assertSchoolAccess(actor, targetSchoolId);

    const [targetClass] = await db
      .select({ id: classes.id, schoolId: classes.schoolId })
      .from(classes)
      .where(and(eq(classes.id, input.classId), isNull(classes.deletedAt)))
      .limit(1);

    if (!targetClass) {
      throw new NotFoundException("Class not found.");
    }
    if (targetClass.schoolId !== school.id) {
      throw new ForbiddenException(
        "Access denied: target class belongs to a different school."
      );
    }

    if (!input.isAllClassSubjects && !input.subjectId) {
      throw new BadRequestException(
        "subjectId is required unless isAllClassSubjects is true (Primary self-contained class)."
      );
    }

    const normalizedSubjectId = input.isAllClassSubjects ? null : input.subjectId ?? null;
    const dupConditions = [
      eq(teacherAssignments.staffProfileId, input.staffProfileId),
      eq(teacherAssignments.classId, input.classId),
      eq(teacherAssignments.sessionId, input.sessionId),
      eq(teacherAssignments.isAllClassSubjects, Boolean(input.isAllClassSubjects)),
    ];
    if (normalizedSubjectId) {
      dupConditions.push(eq(teacherAssignments.subjectId, normalizedSubjectId));
    } else {
      dupConditions.push(isNull(teacherAssignments.subjectId));
    }

    const [existingAssignment] = await db
      .select()
      .from(teacherAssignments)
      .where(and(...dupConditions))
      .limit(1);

    if (existingAssignment) {
      return existingAssignment;
    }

    const [created] = await db
      .insert(teacherAssignments)
      .values({
        staffProfileId: input.staffProfileId,
        branchId: input.branchId ?? school.branchId,
        schoolId: school.id,
        classId: input.classId,
        subjectId: normalizedSubjectId,
        sessionId: input.sessionId,
        isAllClassSubjects: Boolean(input.isAllClassSubjects),
      })
      .returning();

    await auditService.log({
      action: "academics.teacher_assignment.create",
      entityType: "teacher_assignment",
      entityId: created.id,
      branchId: school.branchId,
      schoolId: school.id,
      metadata: {
        staffProfileId: created.staffProfileId,
        classId: created.classId,
        subjectId: created.subjectId,
        isAllClassSubjects: created.isAllClassSubjects,
      },
      req,
    });

    return created;
  },

  async deleteTeacherAssignment(
    actor: AuthenticatedUser,
    assignmentId: string,
    req?: Request
  ) {
    const [existing] = await db
      .select()
      .from(teacherAssignments)
      .where(eq(teacherAssignments.id, assignmentId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException("Teacher assignment not found.");
    }

    const school = await scopeService.assertSchoolAccess(actor, existing.schoolId);

    await db
      .delete(teacherAssignments)
      .where(eq(teacherAssignments.id, assignmentId));

    await auditService.log({
      action: "academics.teacher_assignment.delete",
      entityType: "teacher_assignment",
      entityId: assignmentId,
      branchId: school.branchId,
      schoolId: school.id,
      metadata: {
        staffProfileId: existing.staffProfileId,
        classId: existing.classId,
        subjectId: existing.subjectId,
      },
      req,
    });

    return { id: assignmentId, deleted: true };
  },

  async listClassStudents(
    actor: AuthenticatedUser,
    classId: string,
    sessionId?: string
  ) {
    const [cls] = await db
      .select()
      .from(classes)
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)))
      .limit(1);

    if (!cls) {
      throw new NotFoundException("Class not found.");
    }

    if (actor.role === "student") {
      const { classIds } = await scopeService.getStudentActiveClassIds(actor.id);
      if (!classIds.includes(classId)) {
        throw new ForbiddenException("Access denied: you are not enrolled in this class.");
      }
    } else if (actor.role === "teacher") {
      await scopeService.assertTeacherClassSubjectAccess(actor, classId);
    } else if (actor.role !== "super_admin") {
      await scopeService.assertSchoolAccess(actor, cls.schoolId);
    }

    const conditions = [
      eq(studentEnrollments.classId, classId),
      eq(studentEnrollments.isActive, true),
      isNull(studentProfiles.deletedAt),
      isNull(user.deletedAt),
    ];

    if (sessionId) {
      conditions.push(eq(studentEnrollments.sessionId, sessionId));
    }

    return db
      .select({
        enrollmentId: studentEnrollments.id,
        sessionId: studentEnrollments.sessionId,
        studentProfileId: studentProfiles.id,
        userId: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        image: user.image,
        status: user.status,
        registrationNumber: studentProfiles.registrationNumber,
        gender: studentProfiles.gender,
        gradeLevel: studentProfiles.gradeLevel,
        department: studentProfiles.department,
      })
      .from(studentEnrollments)
      .innerJoin(
        studentProfiles,
        eq(studentEnrollments.studentProfileId, studentProfiles.id)
      )
      .innerJoin(user, eq(studentProfiles.userId, user.id))
      .where(and(...conditions))
      .orderBy(user.name);
  },

  async listTeacherAssignments(
    actor: AuthenticatedUser,
    filters: { classId?: string; staffProfileId?: string; sessionId?: string }
  ) {
    const conditions = [];

    if (actor.role === "teacher") {
      const [staff] = await db
        .select({ id: staffProfiles.id })
        .from(staffProfiles)
        .where(and(eq(staffProfiles.userId, actor.id), isNull(staffProfiles.deletedAt)))
        .limit(1);
      if (!staff) return [];
      conditions.push(eq(teacherAssignments.staffProfileId, staff.id));
    } else if (actor.role !== "super_admin") {
      if (actor.primaryBranchId) {
        conditions.push(eq(teacherAssignments.branchId, actor.primaryBranchId));
      }
      if (actor.primarySchoolId) {
        conditions.push(eq(teacherAssignments.schoolId, actor.primarySchoolId));
      }
    }

    if (filters.classId) conditions.push(eq(teacherAssignments.classId, filters.classId));
    if (filters.staffProfileId && actor.role !== "teacher") {
      conditions.push(eq(teacherAssignments.staffProfileId, filters.staffProfileId));
    }
    if (filters.sessionId) conditions.push(eq(teacherAssignments.sessionId, filters.sessionId));

    return db
      .select({
        id: teacherAssignments.id,
        staffProfileId: teacherAssignments.staffProfileId,
        branchId: teacherAssignments.branchId,
        schoolId: teacherAssignments.schoolId,
        classId: teacherAssignments.classId,
        subjectId: teacherAssignments.subjectId,
        sessionId: teacherAssignments.sessionId,
        isAllClassSubjects: teacherAssignments.isAllClassSubjects,
        staffId: staffProfiles.staffId,
        teacherName: user.name,
        teacherEmail: user.email,
        className: classes.name,
        classCode: classes.code,
        subjectName: subjects.name,
        subjectCode: subjects.code,
      })
      .from(teacherAssignments)
      .innerJoin(staffProfiles, eq(teacherAssignments.staffProfileId, staffProfiles.id))
      .innerJoin(user, eq(staffProfiles.userId, user.id))
      .innerJoin(classes, eq(teacherAssignments.classId, classes.id))
      .leftJoin(subjects, eq(teacherAssignments.subjectId, subjects.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(classes.name);
  },

  async recordAttendance(
    actor: AuthenticatedUser,
    input: {
      classId: string;
      termId: string;
      date: string;
      entries: Array<{
        studentProfileId: string;
        status: "present" | "absent" | "late" | "excused";
        remarks?: string;
      }>;
    },
    req?: Request
  ) {
    if (actor.role === "teacher") {
      await scopeService.assertTeacherClassSubjectAccess(actor, input.classId);
    } else if (actor.role !== "super_admin") {
      const [cls] = await db
        .select({ schoolId: classes.schoolId })
        .from(classes)
        .where(eq(classes.id, input.classId))
        .limit(1);
      if (cls) {
        await scopeService.assertSchoolAccess(actor, cls.schoolId);
      }
    }

    const saved = await db.transaction(async (tx) => {
      const rows = [];
      for (const entry of input.entries) {
        const [row] = await tx
          .insert(attendanceRecords)
          .values({
            studentProfileId: entry.studentProfileId,
            classId: input.classId,
            termId: input.termId,
            date: input.date,
            status: entry.status,
            recordedBy: actor.id,
            remarks: entry.remarks,
          })
          .onConflictDoUpdate({
            target: [attendanceRecords.studentProfileId, attendanceRecords.date],
            set: {
              status: entry.status,
              remarks: entry.remarks,
              recordedBy: actor.id,
              updatedAt: new Date(),
            },
          })
          .returning();
        rows.push(row);
      }
      return rows;
    });

    await auditService.log({
      action: "attendance.record",
      entityType: "class",
      entityId: input.classId,
      metadata: { date: input.date, count: saved.length },
      req,
    });

    return saved;
  },

  async listAttendance(
    actor: AuthenticatedUser,
    filters: { classId: string; date?: string }
  ) {
    const [cls] = await db
      .select({ schoolId: classes.schoolId })
      .from(classes)
      .where(eq(classes.id, filters.classId))
      .limit(1);
    if (cls && actor.role !== "super_admin") {
      await scopeService.assertSchoolAccess(actor, cls.schoolId);
    }

    const conditions = [eq(attendanceRecords.classId, filters.classId)];
    if (filters.date) conditions.push(eq(attendanceRecords.date, filters.date));
    return db
      .select()
      .from(attendanceRecords)
      .where(and(...conditions))
      .orderBy(desc(attendanceRecords.date));
  },

  async listAuditLogs(actor: AuthenticatedUser, limit = 100) {
    const capped = Math.min(200, Math.max(1, limit));
    if (actor.role === "super_admin") {
      return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(capped);
    }
    const conditions = [];
    if (actor.primaryBranchId) conditions.push(eq(auditLogs.branchId, actor.primaryBranchId));
    if (actor.primarySchoolId) conditions.push(eq(auditLogs.schoolId, actor.primarySchoolId));
    return db
      .select()
      .from(auditLogs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(auditLogs.createdAt))
      .limit(capped);
  },
};
