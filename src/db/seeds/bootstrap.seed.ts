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

const INSTITUTION_BRANCHES = [
  { name: "Wuse", code: "WUS", address: "Wuse II Campus, Abuja" },
  { name: "Guzape", code: "GUZ", address: "Guzape Campus, Abuja" },
  { name: "Gwarinpa", code: "GWA", address: "Gwarinpa Campus, Abuja" },
  { name: "Wuye", code: "WUY", address: "Wuye Campus, Abuja" },
] as const;

const DEFAULT_ASSESSMENTS = [
  { assessmentType: "CA1" as const, label: "1st Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "CA2" as const, label: "2nd Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "CA3" as const, label: "3rd Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "CA4" as const, label: "4th Continuous Assessment", defaultMaxScore: 10, weightPercentage: 10 },
  { assessmentType: "Exam" as const, label: "Terminal Examination", defaultMaxScore: 60, weightPercentage: 60 },
];

const bootstrap = async () => {
  logger.info("Running Examinify production bootstrap seed...");

  // 1. Branches & Primary/Secondary Schools
  for (const b of INSTITUTION_BRANCHES) {
    let [branch] = await db.select().from(branches).where(eq(branches.code, b.code)).limit(1);
    if (!branch) {
      [branch] = await db.insert(branches).values(b).returning();
    }

    for (const level of ["primary", "secondary"] as const) {
      const [existingSchool] = await db
        .select()
        .from(schools)
        .where(and(eq(schools.branchId, branch.id), eq(schools.level, level)))
        .limit(1);

      if (!existingSchool) {
        const label = level === "primary" ? "Primary School" : "Secondary School";
        const [createdSchool] = await db
          .insert(schools)
          .values({
            branchId: branch.id,
            level,
            name: `Examinify ${label} — ${branch.name}`,
          })
          .returning();

        for (const cfg of DEFAULT_ASSESSMENTS) {
          await db
            .insert(schoolAssessmentConfigs)
            .values({ schoolId: createdSchool.id, ...cfg })
            .onConflictDoNothing();
        }
      }
    }
  }

  // 2. Academic Session & Terms
  let [session] = await db
    .select()
    .from(academicSessions)
    .where(eq(academicSessions.label, "2025/2026"))
    .limit(1);

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
