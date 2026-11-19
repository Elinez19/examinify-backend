import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  classes,
  schools,
  staffProfiles,
  studentEnrollments,
  studentProfiles,
  teacherAssignments,
} from "../db/schema";
import { AuthenticatedUser } from "../types/express";
import { ForbiddenException, NotFoundException } from "../utils/app-error";

export const scopeService = {
  /**
   * Verifies that the actor can operate within the requested branch/school scope.
   * super_admin has institution-wide access.
   */
  assertBranchSchoolScope(
    actor: AuthenticatedUser,
    target: { branchId?: string | null; schoolId?: string | null }
  ): void {
    if (actor.role === "super_admin") return;

    if (target.branchId && actor.primaryBranchId && target.branchId !== actor.primaryBranchId) {
      throw new ForbiddenException("Access denied: resource belongs to another campus branch.");
    }

    if (target.schoolId && actor.primarySchoolId && target.schoolId !== actor.primarySchoolId) {
      throw new ForbiddenException("Access denied: resource belongs to another school level.");
    }
  },

  /**
   * Resolves a school and confirms actor can access it.
   */
  async assertSchoolAccess(actor: AuthenticatedUser, schoolId: string) {
    const [school] = await db
      .select()
      .from(schools)
      .where(and(eq(schools.id, schoolId), isNull(schools.deletedAt)))
      .limit(1);

    if (!school) {
      throw new NotFoundException("School not found.");
    }

    this.assertBranchSchoolScope(actor, { branchId: school.branchId, schoolId: school.id });
    return school;
  },

  /**
   * Verifies that a teacher is assigned to teach a specific class (and optional subject).
   * Supports multi-branch teacher assignments and Primary self-contained classes (isAllClassSubjects).
   */
  async assertTeacherClassSubjectAccess(
    actor: AuthenticatedUser,
    classId: string,
    subjectId?: string
  ): Promise<void> {
    if (actor.role === "super_admin") return;

    const [targetClass] = await db
      .select({
        id: classes.id,
        schoolId: classes.schoolId,
        branchId: schools.branchId,
      })
      .from(classes)
      .innerJoin(schools, eq(classes.schoolId, schools.id))
      .where(and(eq(classes.id, classId), isNull(classes.deletedAt)))
      .limit(1);

    if (!targetClass) {
      throw new NotFoundException("Class not found.");
    }

    if (actor.role === "school_admin" || actor.role === "examiner") {
      this.assertBranchSchoolScope(actor, {
        branchId: targetClass.branchId,
        schoolId: targetClass.schoolId,
      });
      return;
    }

    if (actor.role !== "teacher") {
      throw new ForbiddenException("Access denied for this class.");
    }

    const [staff] = await db
      .select()
      .from(staffProfiles)
      .where(and(eq(staffProfiles.userId, actor.id), isNull(staffProfiles.deletedAt)))
      .limit(1);

    if (!staff) {
      throw new ForbiddenException("Staff profile not found for teacher.");
    }

    const assignments = await db
      .select()
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.staffProfileId, staff.id),
          eq(teacherAssignments.classId, classId)
        )
      );

    const hasAccess = assignments.some(
      (a) => a.isAllClassSubjects || !subjectId || a.subjectId === subjectId
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        "Access denied: you are not assigned to this class/subject."
      );
    }
  },

  /**
   * Fetches active class IDs for a student user.
   */
  async getStudentActiveClassIds(userId: string): Promise<{
    studentProfileId: string;
    classIds: string[];
  }> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(and(eq(studentProfiles.userId, userId), isNull(studentProfiles.deletedAt)))
      .limit(1);

    if (!profile) {
      throw new NotFoundException("Student profile not found.");
    }

    const enrollments = await db
      .select({ classId: studentEnrollments.classId })
      .from(studentEnrollments)
      .where(
        and(
          eq(studentEnrollments.studentProfileId, profile.id),
          eq(studentEnrollments.isActive, true)
        )
      );

    return {
      studentProfileId: profile.id,
      classIds: enrollments.map((e) => e.classId),
    };
  },
};
