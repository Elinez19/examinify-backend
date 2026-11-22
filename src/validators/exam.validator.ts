import { z } from "zod";

const optionSchema = z.object({
  id: z.string().trim().min(1).max(16),
  label: z.string().trim().min(1).max(8),
  text: z.string().trim().min(1).max(1000),
});

const rubricSchema = z.object({
  id: z.string().trim().min(1).max(32),
  criterion: z.string().trim().min(2).max(300),
  weight: z.number().min(0.01).max(1),
});

export const createQuestionBankSchema = z
  .object({
    subjectId: z.string().uuid(),
    branchId: z.string().uuid().nullable().optional(),
    schoolLevel: z.enum(["primary", "secondary"]),
    type: z.enum(["mcq", "fill_blanks", "theory"]),
    prompt: z.string().trim().min(5).max(5000),
    contextSnippet: z.string().trim().max(5000).optional(),
    imageUrl: z.string().url().optional(),
    imageCaption: z.string().trim().max(300).optional(),
    options: z.array(optionSchema).min(2).max(6).optional(),
    correctOptionId: z.string().trim().optional(),
    shortAnswer: z.string().trim().max(500).optional(),
    acceptedAnswers: z.array(z.string().trim().min(1)).optional(),
    theoryAnswer: z.string().trim().max(10000).optional(),
    rubrics: z.array(rubricSchema).optional(),
    points: z.number().min(0.5).max(100).default(1),
    explanation: z.string().trim().max(3000).optional(),
    difficulty: z.enum(["basic", "intermediate", "advanced"]).default("intermediate"),
    tags: z.array(z.string().trim().min(1)).default([]),
    isAiGenerated: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    if (data.type === "mcq") {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "MCQ questions require at least 2 options",
        });
      }
      if (!data.correctOptionId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["correctOptionId"],
          message: "MCQ questions require a correctOptionId",
        });
      }
    }
    if (data.type === "fill_blanks" && !data.shortAnswer && (!data.acceptedAnswers || data.acceptedAnswers.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["shortAnswer"],
        message: "Fill-in-the-blanks questions require shortAnswer or acceptedAnswers",
      });
    }
  });

export const aiGenerateQuestionsSchema = z.object({
  subjectId: z.string().uuid(),
  subjectName: z.string().trim().min(2).max(100),
  topic: z.string().trim().min(2).max(200),
  schoolLevel: z.enum(["primary", "secondary"]),
  gradeLevel: z.string().trim().min(2).max(64),
  questionType: z.enum(["mcq", "fill_blanks", "theory"]).default("mcq"),
  difficulty: z.enum(["basic", "intermediate", "advanced"]).default("intermediate"),
  count: z.number().int().min(1).max(15).default(5),
  saveToBank: z.boolean().optional().default(false),
});

export const createExamSchema = z.object({
  title: z.string().trim().min(3).max(200),
  branchId: z.string().uuid().nullable().optional(),
  schoolId: z.string().uuid().nullable().optional(),
  schoolLevel: z.enum(["primary", "secondary"]),
  sessionId: z.string().uuid(),
  termId: z.string().uuid(),
  sessionType: z
    .enum(["single_subject_ca", "two_subject_daily", "national_jamb_mock", "term_exam"])
    .default("single_subject_ca"),
  assessmentType: z.enum(["CA1", "CA2", "CA3", "CA4", "Exam"]).default("CA1"),
  instructions: z.array(z.string().trim().min(1)).default([]),
  durationMinutes: z.number().int().min(5).max(360),
  passingScore: z.number().min(0).max(100).default(50),
  scheduledAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  accessPin: z.string().trim().min(4).max(16).optional(),
  targetClassIds: z.array(z.string().uuid()).min(1),
  sections: z
    .array(
      z.object({
        subjectId: z.string().uuid(),
        title: z.string().trim().min(2).max(120),
        questionBankItemIds: z.array(z.string().uuid()).min(1),
      })
    )
    .min(1),
  allowCalculator: z.boolean().optional().default(false),
  shuffleQuestions: z.boolean().optional().default(true),
  shuffleOptions: z.boolean().optional().default(true),
  allowBackwardNavigation: z.boolean().optional().default(true),
  strictProctoring: z.boolean().optional().default(true),
  maxInfractions: z.number().int().min(1).max(20).optional().default(3),
  maxTabSwitches: z.number().int().min(1).max(20).optional().default(3),
  autoPublishResults: z.boolean().optional().default(false),
  showStudentFeedback: z.boolean().optional().default(true),
  showCorrectAnswers: z.boolean().optional().default(false),
  enableLiveMonitoring: z.boolean().optional().default(true),
});

export const approveExamSchema = z.object({
  status: z.enum(["scheduled", "live"]).default("scheduled"),
  scheduledAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  accessPin: z.string().trim().min(4).max(16).optional(),
});

export const updateExamSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  instructions: z.array(z.string().trim().min(1)).optional(),
  durationMinutes: z.number().int().min(5).max(360).optional(),
  passingScore: z.number().min(0).max(100).optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  accessPin: z.string().trim().min(4).max(16).nullable().optional(),
  status: z.enum(["draft", "completed"]).optional(),
  allowCalculator: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  allowBackwardNavigation: z.boolean().optional(),
  strictProctoring: z.boolean().optional(),
  maxInfractions: z.number().int().min(1).max(20).optional(),
  maxTabSwitches: z.number().int().min(1).max(20).optional(),
  autoPublishResults: z.boolean().optional(),
  showStudentFeedback: z.boolean().optional(),
  showCorrectAnswers: z.boolean().optional(),
  enableLiveMonitoring: z.boolean().optional(),
});

export const releaseExamResultsSchema = z.object({
  attemptIds: z.array(z.string().uuid()).optional(),
  includeFlagged: z.boolean().optional().default(false),
  markExamPublished: z.boolean().optional().default(true),
});

export const publishGradebookSchema = z.object({
  termId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  isPublished: z.boolean().optional().default(true),
});

export const gradeTheoryAnswerSchema = z.object({
  awardedPoints: z.number().min(0).max(100).optional(),
  rubricBreakdown: z
    .array(
      z.object({
        criterionId: z.string().min(1),
        score: z.number().min(0).max(100),
        comment: z.string().max(500).optional(),
      })
    )
    .optional(),
  graderFeedback: z.string().trim().max(2000).optional(),
});

export const upsertGradebookSchema = z.object({
  studentProfileId: z.string().uuid(),
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  sessionId: z.string().uuid(),
  termId: z.string().uuid(),
  ca1Score: z.number().min(0).max(20).default(0),
  ca2Score: z.number().min(0).max(20).default(0),
  ca3Score: z.number().min(0).max(20).default(0),
  ca4Score: z.number().min(0).max(20).default(0),
  terminalExamScore: z.number().min(0).max(100).default(0),
  overrideReason: z.string().trim().max(300).optional(),
});

export type CreateQuestionBankInput = z.infer<typeof createQuestionBankSchema>;
export type AiGenerateQuestionsInput = z.infer<typeof aiGenerateQuestionsSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type ApproveExamInput = z.infer<typeof approveExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
export type ReleaseExamResultsInput = z.infer<typeof releaseExamResultsSchema>;
export type GradeTheoryAnswerInput = z.infer<typeof gradeTheoryAnswerSchema>;
export type UpsertGradebookInput = z.infer<typeof upsertGradebookSchema>;
export type PublishGradebookInput = z.infer<typeof publishGradebookSchema>;
