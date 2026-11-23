import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { Env } from "../../config/env.config";
import { db, pool } from "../index";
import {
  academicSessions,
  account,
  branches,
  schoolAssessmentConfigs,
  schools,
  staffProfiles,
  terms,
  user,
} from "../schema";
import { logger } from "../../utils/logger";
import {
  isCanonicalSchoolForBranch,
  PREASSIGNED_BRANCHES,
  PREASSIGNED_SCHOOLS,
} from "../../config/preassigned-classes.config";
import { preassignedClassesService } from "../../services/preassigned-classes.service";

const DEFAULT_ASSESSMENTS = [
  { assessmentType: "CA1" as const, label: "1st Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "CA2" as const, label: "2nd Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "CA3" as const, label: "3rd Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "CA4" as const, label: "4th Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "Exam" as const, label: "Terminal Examination", defaultMaxScore: 60, weightPercentage: 60 },
];

const bootstrap = async () => {
  logger.info("Running Examinify production bootstrap seed...");

  // 1. Branches (Guzape, Gwarinpa, Wuse, Wuye)
  const branchByCode = new Map<string, { id: string; code: string; name: string }>();
  for (const b of PREASSIGNED_BRANCHES) {
    let [branch] = await db.select().from(branches).where(eq(branches.code, b.code)).limit(1);
    if (!branch) {
      [branch] = await db.insert(branches).values(b).returning();
    }
    branchByCode.set(b.code, branch);
  }

  // 2. Canonical Schools (3 Primary Academies + 3 Secondary Colleges)
  const seededSchools: Array<{ id: string; name: string; level: "primary" | "secondary" }> = [];
  for (const spec of PREASSIGNED_SCHOOLS) {
    const branch = branchByCode.get(spec.branchCode);
    if (!branch) continue;

    const [existingSchool] = await db
      .select()
      .from(schools)
      .where(and(eq(schools.branchId, branch.id), eq(schools.level, spec.level)))
      .limit(1);

    let schoolRecord = existingSchool;
    if (!schoolRecord) {
      [schoolRecord] = await db
        .insert(schools)
        .values({
          branchId: branch.id,
          level: spec.level,
          name: spec.name,
          isActive: true,
        })
        .returning();
    } else if (
      schoolRecord.name !== spec.name ||
      !schoolRecord.isActive ||
      schoolRecord.deletedAt
    ) {
      [schoolRecord] = await db
        .update(schools)
        .set({
          name: spec.name,
          isActive: true,
          deletedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(schools.id, schoolRecord.id))
        .returning();
    }

    for (const cfg of DEFAULT_ASSESSMENTS) {
      await db
        .insert(schoolAssessmentConfigs)
        .values({ schoolId: schoolRecord.id, ...cfg })
        .onConflictDoNothing();
    }

    seededSchools.push({
      id: schoolRecord.id,
      name: schoolRecord.name,
      level: schoolRecord.level,
    });
  }

  // Safely deactivate any legacy non-canonical (branch, level) schools (e.g. Wuse Secondary / Wuye Primary)
  const allBranchSchools = await db
    .select({
      id: schools.id,
      level: schools.level,
      isActive: schools.isActive,
      branchCode: branches.code,
    })
    .from(schools)
    .innerJoin(branches, eq(schools.branchId, branches.id));

  for (const s of allBranchSchools) {
    if (s.isActive && !isCanonicalSchoolForBranch(s.branchCode, s.level)) {
      await db
        .update(schools)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schools.id, s.id));
    }
  }

  // 3. Academic Session & Terms
  let [session] = await db
    .select()
    .from(academicSessions)
    .where(eq(academicSessions.isActive, true))
    .limit(1);

  if (!session) {
    [session] = await db
      .select()
      .from(academicSessions)
      .where(eq(academicSessions.label, "2025/2026"))
      .limit(1);
  }

  if (!session) {
    [session] = await db
      .insert(academicSessions)
      .values({ label: "2025/2026", isActive: true })
      .returning();
  }

  const termDefs = [
    { name: "1st Term", orderIndex: 1, isActive: false },
    { name: "2nd Term", orderIndex: 2, isActive: true },
    { name: "3rd Term", orderIndex: 3, isActive: false },
  ];

  for (const t of termDefs) {
    await db
      .insert(terms)
      .values({ sessionId: session.id, ...t })
      .onConflictDoNothing();
  }

  // 4. Preassigned Classes per School Level (Primary for Academies, Secondary for Colleges)
  for (const school of seededSchools) {
    const inserted = await preassignedClassesService.ensurePreassignedClassesForSchool(
      school.id,
      school.level,
      session.id
    );
    logger.info("Preassigned classes ensured for school", {
      school: school.name,
      level: school.level,
      inserted,
    });
  }

  // 3. Single Super Admin Account
  const superAdminUsername = Env.BOOTSTRAP_SUPER_ADMIN_USERNAME.trim().toLowerCase();
  const superAdminEmail = Env.BOOTSTRAP_SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const [existingSuper] = await db
    .select()
    .from(user)
    .where(eq(user.role, "super_admin"))
    .limit(1);

  if (!existingSuper) {
    const rawPassword = Env.BOOTSTRAP_SUPER_ADMIN_PASSWORD || "SuperAdmin@2026!";
    const passwordHash = await hashPassword(rawPassword);
    const userId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: Env.BOOTSTRAP_SUPER_ADMIN_NAME,
        email: superAdminEmail,
        emailVerified: true,
        username: superAdminUsername,
        displayUsername: Env.BOOTSTRAP_SUPER_ADMIN_USERNAME,
        role: "super_admin",
        status: "active",
        mustChangePassword: false,
      });

      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });

      await tx.insert(staffProfiles).values({
        userId,
        staffId: "EXM-SUPER-001",
        staffCategory: "admin",
        title: "Institution Super Administrator",
        department: "Executive Management",
      });
    });

    logger.info("Bootstrapped Super Admin account", { username: superAdminUsername });
  } else {
    logger.info("Super Admin account already exists; skipping creation.");
  }

  logger.info("Bootstrap seed completed successfully.");
};

bootstrap()
  .catch((err) => {
    logger.error("Bootstrap seed failed", { error: (err as Error).message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
