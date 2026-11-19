import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { Env } from "../config/env.config";
import { cacheStore } from "../config/redis.config";
import { AuthenticatedUser } from "../types/express";
import { InternalServerException, TooManyRequestsException } from "../utils/app-error";
import { AiGenerateQuestionsInput } from "../validators/exam.validator";

const DAILY_TEACHER_AI_LIMIT = 50;

const generatedQuestionSchema = z.object({
  prompt: z.string().min(5),
  contextSnippet: z.string().optional(),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        text: z.string(),
      })
    )
    .optional(),
  correctOptionId: z.string().optional(),
  shortAnswer: z.string().optional(),
  acceptedAnswers: z.array(z.string()).optional(),
  theoryAnswer: z.string().optional(),
  rubrics: z
    .array(
      z.object({
        id: z.string(),
        criterion: z.string(),
        weight: z.number(),
      })
    )
    .optional(),
  points: z.number().min(0.5).max(100).default(1),
  explanation: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

const aiResponseSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

export type GeneratedDraftQuestion = z.infer<typeof generatedQuestionSchema>;

export const aiQuestionService = {
  async generateDraftQuestions(
    actor: AuthenticatedUser,
    input: AiGenerateQuestionsInput
  ): Promise<GeneratedDraftQuestion[]> {
    if (!Env.GEMINI_API_KEY) {
      throw new InternalServerException(
        "AI Question Generator is not configured (GEMINI_API_KEY missing)."
      );
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const quotaKey = `examinify:ai_quota:${actor.id}:${dayKey}`;
    const usedCount = await cacheStore.incrWithTtl(quotaKey, 86400);
    if (usedCount > DAILY_TEACHER_AI_LIMIT) {
      throw new TooManyRequestsException(
        "Daily AI question generation quota reached. Try again tomorrow."
      );
    }

    const ai = new GoogleGenAI({ apiKey: Env.GEMINI_API_KEY });

    const systemPrompt = [
      "You are an expert Nigerian Primary & Secondary curriculum assessment author (WAEC/NECO/JAMB standards).",
      `Generate exactly ${input.count} ${input.difficulty} ${input.questionType} questions for ${input.schoolLevel} school (${input.gradeLevel}) on subject "${input.subjectName}", topic "${input.topic}".`,
      "Return ONLY valid JSON matching this exact structure:",
      `{ "questions": [ { "prompt": "...", "options": [{"id":"A","label":"A","text":"..."},{"id":"B","label":"B","text":"..."},{"id":"C","label":"C","text":"..."},{"id":"D","label":"D","text":"..."}], "correctOptionId": "A", "shortAnswer": "...", "acceptedAnswers": ["..."], "theoryAnswer": "...", "rubrics": [{"id":"r1","criterion":"...","weight":0.5},{"id":"r2","criterion":"...","weight":0.5}], "points": 2, "explanation": "...", "tags": ["..."] } ] }`,
      "For mcq, provide 4 options (A-D) and correctOptionId. For fill_blanks, provide shortAnswer and acceptedAnswers. For theory, provide theoryAnswer and rubrics whose weights sum to 1.0.",
    ].join("\n");

    const response = await ai.models.generateContent({
      model: Env.GEMINI_MODEL,
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new InternalServerException("AI model returned an empty response.");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      throw new InternalServerException("AI model returned invalid JSON output.");
    }

    const validated = aiResponseSchema.parse(parsedJson);
    return validated.questions;
  },
};
