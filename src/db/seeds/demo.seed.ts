import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { Env } from "../../config/env.config";
import { db, pool } from "../index";
import {
  academicSessions,
  account,
  branches,
  classes,
  examQuestionLinks,
  examQuestionSnapshots,
  exams,
  examSections,
  examTargetClasses,
  guardians,
  questionBankItems,
  schools,
  staffProfiles,
  studentEnrollments,
  studentProfiles,
  subjects,
  teacherAssignments,
  terms,
  user,
} from "../schema";
import { hashValue } from "../../utils/bcrypt";
import { logger } from "../../utils/logger";

const seedDemo = async () => {
  if (Env.NODE_ENV === "production") {
    throw new Error("Refusing to run demo seed in production environment.");
  }

  logger.info("Running Examinify development/staging demo seed...");

  const [guzape] = await db.select().from(branches).where(eq(branches.code, "GUZ")).limit(1);
  if (!guzape) {
    throw new Error("Run `npm run db:seed:bootstrap` before running the demo seed.");
  }

  const [guzapeSecondary] = await db
    .select()
    .from(schools)
    .where(and(eq(schools.branchId, guzape.id), eq(schools.level, "secondary")))
    .limit(1);

  const [guzapePrimary] = await db
    .select()
    .from(schools)
    .where(and(eq(schools.branchId, guzape.id), eq(schools.level, "primary")))
    .limit(1);

  const [activeSession] = await db
    .select()
    .from(academicSessions)
    .where(eq(academicSessions.isActive, true))
    .limit(1);

  const [activeTerm] = await db
    .select()
    .from(terms)
    .where(and(eq(terms.sessionId, activeSession.id), eq(terms.isActive, true)))
    .limit(1);

  const ensureAccount = async (params: {
    username: string;
    email: string;
    name: string;
    password: string;
    role: "school_admin" | "examiner" | "teacher" | "non_academic_staff" | "student";
    branchId: string;
    schoolId: string;
    twoFactorEnabled?: boolean;
  }) => {
    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.username, params.username.toLowerCase()))
      .limit(1);
    if (existing) return existing;

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(params.password);
    const [created] = await db
      .insert(user)
      .values({
        id,
        name: params.name,
        email: params.email.toLowerCase(),
        emailVerified: true,
        username: params.username.toLowerCase(),
        displayUsername: params.username,
        role: params.role,
        status: "active",
        mustChangePassword: false,
        twoFactorEnabled: params.twoFactorEnabled ?? false,
        primaryBranchId: params.branchId,
        primarySchoolId: params.schoolId,
      })
      .returning();

    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: "credential",
      userId: id,
      password: passwordHash,
    });

    return created;
  };

  // Demo Users
  const adminUser = await ensureAccount({
    username: "admin.guzape",
    email: "admin.guzape@examinify.edu.ng",
    name: "Dr. Amina Bello",
    password: "Password@123",
    role: "school_admin",
    branchId: guzape.id,
    schoolId: guzapeSecondary.id,
    twoFactorEnabled: true,
  });

  const examinerUser = await ensureAccount({
    username: "examiner.guzape",
    email: "examiner.guzape@examinify.edu.ng",
    name: "Mr. Chinedu Okafor",
    password: "Password@123",
    role: "examiner",
    branchId: guzape.id,
    schoolId: guzapeSecondary.id,
  });

  const teacherUser = await ensureAccount({
    username: "teacher.maths",
    email: "teacher.maths@examinify.edu.ng",
    name: "Mrs. Funke Adeyemi",
    password: "Password@123",
    role: "teacher",
    branchId: guzape.id,
    schoolId: guzapeSecondary.id,
  });

  const staffUser = await ensureAccount({
    username: "staff.guzape",
    email: "staff.guzape@examinify.edu.ng",
    name: "Mr. Ibrahim Musa",
    password: "Password@123",
    role: "non_academic_staff",
    branchId: guzape.id,
    schoolId: guzapeSecondary.id,
  });

  const studentUser = await ensureAccount({
    username: "EXM/GUZ/2026/001",
    email: "tunde.bakare@student.examinify.edu.ng",
    name: "Tunde Bakare",
    password: "Password@123",
    role: "student",
    branchId: guzape.id,
    schoolId: guzapeSecondary.id,
  });

  // Staff Profiles
  const ensureStaff = async (
    userId: string,
    staffId: string,
    staffCategory: "admin" | "academic" | "non_academic",
    title: string,
    department: string
  ) => {
    const [existing] = await db
      .select()
      .from(staffProfiles)
      .where(eq(staffProfiles.userId, userId))
      .limit(1);
    if (existing) return existing;
    const [created] = await db
      .insert(staffProfiles)
      .values({ userId, staffId, staffCategory, title, department })
      .returning();
    return created;
  };

  await ensureStaff(adminUser.id, "STF-GUZ-ADM-01", "admin", "Principal", "Administration");
  await ensureStaff(examinerUser.id, "STF-GUZ-EXM-01", "academic", "CBT Exam Officer", "Examinations");
  const mathsTeacherStaff = await ensureStaff(
    teacherUser.id,
    "STF-GUZ-TCH-01",
    "academic",
    "Senior Mathematics Teacher",
    "STEM"
  );
  await ensureStaff(staffUser.id, "STF-GUZ-NAS-01", "non_academic", "Records & Attendance Officer", "Registry");

  // Classes
  let [ss1Explorers] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.schoolId, guzapeSecondary.id), eq(classes.code, "SS1-EXP")))
    .limit(1);

  if (!ss1Explorers) {
    [ss1Explorers] = await db
      .insert(classes)
      .values({
        schoolId: guzapeSecondary.id,
        sessionId: activeSession.id,
        name: "SS 1 Explorers",
        code: "SS1-EXP",
        gradeLevel: "SS 1",
        department: "Science",
        room: "Block B, Room 102",
        formMasterId: teacherUser.id,
        isPrimarySelfContained: false,
      })
      .returning();
  }

  const [grade4] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.schoolId, guzapePrimary.id), eq(classes.code, "G4-DIA")))
    .limit(1);

  if (!grade4) {
    await db.insert(classes).values({
      schoolId: guzapePrimary.id,
      sessionId: activeSession.id,
      name: "Grade 4 Diamond",
      code: "G4-DIA",
      gradeLevel: "Grade 4",
      room: "Primary Wing, Room 4A",
      isPrimarySelfContained: true,
    });
  }

  // Subject
  let [maths] = await db
    .select()
    .from(subjects)
    .where(and(eq(subjects.code, "MTH"), eq(subjects.schoolLevel, "secondary")))
    .limit(1);

  if (!maths) {
    [maths] = await db
      .insert(subjects)
      .values({
        schoolLevel: "secondary",
        name: "Mathematics",
        code: "MTH",
        category: "STEM",
        department: "Science",
      })
      .returning();
  }

  // Teacher Assignment
  const [existingAssign] = await db
    .select()
    .from(teacherAssignments)
    .where(
      and(
        eq(teacherAssignments.staffProfileId, mathsTeacherStaff.id),
        eq(teacherAssignments.classId, ss1Explorers.id),
        eq(teacherAssignments.subjectId, maths.id)
      )
    )
    .limit(1);

  if (!existingAssign) {
    await db.insert(teacherAssignments).values({
      staffProfileId: mathsTeacherStaff.id,
      branchId: guzape.id,
      schoolId: guzapeSecondary.id,
      classId: ss1Explorers.id,
      subjectId: maths.id,
      sessionId: activeSession.id,
      isAllClassSubjects: false,
    });
  }

  // Student Profile + Guardian + Enrollment
  let [studentProfile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, studentUser.id))
    .limit(1);

  if (!studentProfile) {
    [studentProfile] = await db
      .insert(studentProfiles)
      .values({
        userId: studentUser.id,
        registrationNumber: "EXM/GUZ/2026/001",
        gender: "male",
        gradeLevel: "SS 1",
        department: "Science",
        targetExamTrack: "WAEC / JAMB",
        targetExamYear: "2028",
      })
      .returning();

    await db.insert(guardians).values({
      studentProfileId: studentProfile.id,
      fullName: "Engr. Olawale Bakare",
      relationship: "Father",
      phone: "+2348030001122",
      email: "olawale.bakare@example.com",
      address: "Plot 14 Guzape District, Abuja",
      isPrimary: true,
    });

    await db
      .insert(studentEnrollments)
      .values({
        studentProfileId: studentProfile.id,
        classId: ss1Explorers.id,
        sessionId: activeSession.id,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  // Demo Question Bank + Live CBT Exam
  const [existingExam] = await db
    .select()
    .from(exams)
    .where(eq(exams.title, "SS 1 Mathematics — 2nd Term CA1 Demo"))
    .limit(1);

  if (!existingExam) {
    const [q1] = await db
      .insert(questionBankItems)
      .values({
        subjectId: maths.id,
        branchId: guzape.id,
        schoolLevel: "secondary",
        createdBy: teacherUser.id,
        type: "mcq",
        prompt: "Solve for x: 2x + 6 = 18",
        options: [
          { id: "A", label: "A", text: "4" },
          { id: "B", label: "B", text: "6" },
          { id: "C", label: "C", text: "8" },
          { id: "D", label: "D", text: "12" },
        ],
        correctOptionId: "B",
        points: "5.00",
        explanation: "2x = 12, therefore x = 6.",
        difficulty: "basic",
        tags: ["algebra", "linear-equations"],
      })
      .returning();

    const [q2] = await db
      .insert(questionBankItems)
      .values({
        subjectId: maths.id,
        branchId: guzape.id,
        schoolLevel: "secondary",
        createdBy: teacherUser.id,
        type: "fill_blanks",
        prompt: "What is the square root of 144?",
        shortAnswer: "12",
        acceptedAnswers: ["12", "twelve"],
        points: "5.00",
        explanation: "12 x 12 = 144.",
        difficulty: "basic",
        tags: ["arithmetic"],
      })
      .returning();

    const pinHash = await hashValue("123456");
    const [demoExam] = await db
      .insert(exams)
      .values({
        title: "SS 1 Mathematics — 2nd Term CA1 Demo",
        branchId: guzape.id,
        schoolId: guzapeSecondary.id,
        schoolLevel: "secondary",
        sessionId: activeSession.id,
        termId: activeTerm.id,
        createdBy: teacherUser.id,
        approvedBy: teacherUser.id,
        approvedAt: new Date(),
        sessionType: "single_subject_ca",
        assessmentType: "CA1",
        status: "live",
        instructions: [
          "Answer all questions within 30 minutes.",
          "Do not switch tabs or exit fullscreen mode.",
        ],
        durationMinutes: 30,
        passingScore: "50.00",
        accessPinHash: pinHash,
        autoPublishResults: true,
        showStudentFeedback: true,
        strictProctoring: true,
        maxInfractions: 3,
      })
      .returning();

    await db.insert(examTargetClasses).values({
      examId: demoExam.id,
      classId: ss1Explorers.id,
    });

    const [sec] = await db
      .insert(examSections)
      .values({
        examId: demoExam.id,
        subjectId: maths.id,
        title: "Mathematics",
        orderIndex: 0,
        totalQuestions: 2,
        maxScore: "10.00",
      })
      .returning();

    await db.insert(examQuestionLinks).values([
      { examId: demoExam.id, sectionId: sec.id, questionBankItemId: q1.id, orderIndex: 1 },
      { examId: demoExam.id, sectionId: sec.id, questionBankItemId: q2.id, orderIndex: 2 },
    ]);

    await db.insert(examQuestionSnapshots).values([
      {
        examId: demoExam.id,
        sectionId: sec.id,
        subjectId: maths.id,
        sourceQuestionId: q1.id,
        questionNumber: 1,
        type: q1.type,
        prompt: q1.prompt,
        options: q1.options,
        correctOptionId: q1.correctOptionId,
        points: q1.points,
        explanation: q1.explanation,
      },
      {
        examId: demoExam.id,
        sectionId: sec.id,
        subjectId: maths.id,
        sourceQuestionId: q2.id,
        questionNumber: 2,
        type: q2.type,
        prompt: q2.prompt,
        shortAnswer: q2.shortAnswer,
        acceptedAnswers: q2.acceptedAnswers,
        points: q2.points,
        explanation: q2.explanation,
      },
    ]);
  }

  logger.info("Demo seed completed successfully.");
};

seedDemo()
  .catch((err) => {
    logger.error("Demo seed failed", { error: (err as Error).message });
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
