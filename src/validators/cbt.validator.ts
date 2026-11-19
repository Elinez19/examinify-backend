import { z } from "zod";

export const startAttemptSchema = z.object({
  accessPin: z.string().trim().min(1).max(32).optional(),
});

export const saveAnswerSchema = z.object({
  snapshotQuestionId: z.string().uuid(),
  selectedOptionId: z.string().trim().max(32).nullable().optional(),
  textResponse: z.string().max(15000).nullable().optional(),
  isFlagged: z.boolean().optional(),
  isVisited: z.boolean().optional().default(true),
});

export const recordInfractionSchema = z.object({
  eventType: z.enum([
    "tab_switch",
    "fullscreen_exit",
    "window_blur",
    "copy_attempt",
  ]),
  details: z.record(z.string(), z.unknown()).optional().default({}),
});

export const forceSubmitSchema = z.object({
  reason: z.string().trim().min(3).max(300).optional(),
});

export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type SaveAnswerInput = z.infer<typeof saveAnswerSchema>;
export type RecordInfractionInput = z.infer<typeof recordInfractionSchema>;
