import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../db";
import { academicSessions, classes, schools } from "../db/schema";
import type { SchoolLevel } from "../db/schema/enums";
import { getPreassignedClassTemplates } from "../config/preassigned-classes.config";

export const preassignedClassesService = {
  /**
   * Idempotently ensures all preassigned classes for a school + academic session exist.
   * Primary schools (Academies) receive Primary/Early Years classes;
   * Secondary schools (Colleges) receive JSS 1 - SS 3 classes.
   */
  async ensurePreassignedClassesForSchool(
    schoolId: string,
    schoolLevel: SchoolLevel,
    sessionId: string
  ): Promise<number> {
    const templates = getPreassignedClassTemplates(schoolLevel);
    const existing = await db
      .select({ code: classes.code, name: classes.name })
      .from(classes)
      .where(
        and(
          eq(classes.schoolId, schoolId),
          eq(classes.sessionId, sessionId),
          isNull(classes.deletedAt)
        )
      );

    const existingCodes = new Set(existing.map((r) => r.code.trim().toUpperCase()));
    const existingNames = new Set(existing.map((r) => r.name.trim().toUpperCase()));

    const toInsert = templates
      .filter(
        (tpl) =>
          !existingCodes.has(tpl.code.toUpperCase()) &&
          !existingNames.has(tpl.name.toUpperCase())
      )
      .map((tpl) => ({
        schoolId,
        sessionId,
        name: tpl.name,
        code: tpl.code,
        gradeLevel: tpl.gradeLevel,
        isPrimarySelfContained: tpl.isPrimarySelfContained,
      }));

    if (toInsert.length > 0) {
      await db.insert(classes).values(toInsert).onConflictDoNothing();
    }

    return toInsert.length;
  },

  /**
   * Ensures preassigned classes exist for a school in the current active academic session.
   */
  async ensurePreassignedClassesForSchoolActiveSession(
    schoolId: string,
    schoolLevel: SchoolLevel
  ): Promise<number> {
    let [session] = await db
      .select({ id: academicSessions.id })
      .from(academicSessions)
      .where(eq(academicSessions.isActive, true))
      .limit(1);

    if (!session) {
      [session] = await db
        .select({ id: academicSessions.id })
        .from(academicSessions)
        .orderBy(desc(academicSessions.createdAt))
        .limit(1);
    }

    if (!session) return 0;

    return this.ensurePreassignedClassesForSchool(schoolId, schoolLevel, session.id);
  },

  /**
   * Ensures every active school has its preassigned classes populated for a session.
   */
  async ensurePreassignedClassesForAllSchoolsInSession(
    sessionId: string
  ): Promise<number> {
    const activeSchools = await db
      .select({ id: schools.id, level: schools.level })
      .from(schools)
      .where(and(eq(schools.isActive, true), isNull(schools.deletedAt)));

    let totalInserted = 0;
    for (const school of activeSchools) {
      totalInserted += await this.ensurePreassignedClassesForSchool(
        school.id,
        school.level,
        sessionId
      );
    }
    return totalInserted;
  },
};
