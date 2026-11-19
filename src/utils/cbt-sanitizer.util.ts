import { QuestionOptionItem, QuestionType } from "../db/schema";

export interface SnapshotQuestionRecord {
  id: string;
  examId: string;
  sectionId: string;
  subjectId: string;
  questionNumber: number;
  type: QuestionType;
  prompt: string;
  contextSnippet: string | null;
  imageUrl: string | null;
  imageCaption: string | null;
  options: QuestionOptionItem[] | null;
  correctOptionId: string | null;
  shortAnswer: string | null;
  acceptedAnswers: string[] | null;
  theoryAnswer: string | null;
  rubrics: unknown;
  points: string;
  explanation: string | null;
}

export interface SanitizedActiveQuestion {
  id: string;
  sectionId: string;
  subjectId: string;
  questionNumber: number;
  type: QuestionType;
  prompt: string;
  contextSnippet: string | null;
  imageUrl: string | null;
  imageCaption: string | null;
  options: QuestionOptionItem[] | null;
  points: number;
}

/**
 * Strips all answer keys, rubrics, model answers, and explanations from a snapshot
 * question before sending it to a student during an active CBT attempt.
 */
export const sanitizeQuestionForActiveAttempt = (
  question: SnapshotQuestionRecord,
  optionOrder?: string[]
): SanitizedActiveQuestion => {
  let orderedOptions = question.options
    ? question.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
        text: opt.text,
      }))
    : null;

  if (orderedOptions && optionOrder && optionOrder.length > 0) {
    const byId = new Map(orderedOptions.map((o) => [o.id, o]));
    const reordered: QuestionOptionItem[] = [];
    for (const id of optionOrder) {
      const match = byId.get(id);
      if (match) reordered.push(match);
    }
    if (reordered.length === orderedOptions.length) {
      orderedOptions = reordered;
    }
  }

  return {
    id: question.id,
    sectionId: question.sectionId,
    subjectId: question.subjectId,
    questionNumber: question.questionNumber,
    type: question.type,
    prompt: question.prompt,
    contextSnippet: question.contextSnippet,
    imageUrl: question.imageUrl,
    imageCaption: question.imageCaption,
    options: orderedOptions,
    points: Number(question.points),
  };
};

export const shuffleArray = <T>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
