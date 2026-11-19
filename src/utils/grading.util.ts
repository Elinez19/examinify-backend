import {
  QuestionRubricCriterion,
  QuestionType,
  RubricScoreEntry,
} from "../db/schema";

export interface WaecGradeResult {
  gradeLetter: "A1" | "B2" | "B3" | "C4" | "C5" | "C6" | "D7" | "E8" | "F9";
  remarks: string;
  isPassed: boolean;
  isAtRisk: boolean;
}

export const computeWaecGrade = (percentage: number): WaecGradeResult => {
  const clamped = Math.max(0, Math.min(100, Number(percentage.toFixed(2))));

  if (clamped >= 75) {
    return { gradeLetter: "A1", remarks: "Excellent", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 70) {
    return { gradeLetter: "B2", remarks: "Very Good", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 65) {
    return { gradeLetter: "B3", remarks: "Good", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 60) {
    return { gradeLetter: "C4", remarks: "Credit", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 55) {
    return { gradeLetter: "C5", remarks: "Credit", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 50) {
    return { gradeLetter: "C6", remarks: "Credit", isPassed: true, isAtRisk: false };
  }
  if (clamped >= 45) {
    return { gradeLetter: "D7", remarks: "Pass", isPassed: false, isAtRisk: true };
  }
  if (clamped >= 40) {
    return { gradeLetter: "E8", remarks: "Pass", isPassed: false, isAtRisk: true };
  }
  return { gradeLetter: "F9", remarks: "Fail", isPassed: false, isAtRisk: true };
};

export interface GradebookComputationInput {
  ca1Score: number;
  ca2Score: number;
  ca3Score: number;
  ca4Score: number;
  terminalExamScore: number;
}

export const computeGradebookTotals = (input: GradebookComputationInput) => {
  const totalCaScore = Number(
    (input.ca1Score + input.ca2Score + input.ca3Score + input.ca4Score).toFixed(2)
  );
  const grandTotal = Number((totalCaScore + input.terminalExamScore).toFixed(2));
  const waec = computeWaecGrade(grandTotal);

  return {
    totalCaScore,
    grandTotal,
    gradeLetter: waec.gradeLetter,
    remarks: waec.remarks,
    isAtRisk: waec.isAtRisk,
  };
};

const normalizeTextAnswer = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const autoGradeObjectiveAnswer = (params: {
  type: QuestionType;
  points: number;
  correctOptionId?: string | null;
  shortAnswer?: string | null;
  acceptedAnswers?: string[] | null;
  selectedOptionId?: string | null;
  textResponse?: string | null;
}): { isCorrect: boolean | null; awardedPoints: number | null; requiresManualGrading: boolean } => {
  if (params.type === "theory") {
    return {
      isCorrect: null,
      awardedPoints: null,
      requiresManualGrading: true,
    };
  }

  if (params.type === "mcq") {
    const isCorrect =
      Boolean(params.selectedOptionId) &&
      Boolean(params.correctOptionId) &&
      params.selectedOptionId === params.correctOptionId;
    return {
      isCorrect,
      awardedPoints: isCorrect ? params.points : 0,
      requiresManualGrading: false,
    };
  }

  // fill_blanks
  if (!params.textResponse || !params.textResponse.trim()) {
    return { isCorrect: false, awardedPoints: 0, requiresManualGrading: false };
  }

  const candidate = normalizeTextAnswer(params.textResponse);
  const acceptable = new Set<string>();
  if (params.shortAnswer) acceptable.add(normalizeTextAnswer(params.shortAnswer));
  if (params.acceptedAnswers) {
    for (const ans of params.acceptedAnswers) {
      if (ans) acceptable.add(normalizeTextAnswer(ans));
    }
  }

  const isCorrect = acceptable.has(candidate);
  return {
    isCorrect,
    awardedPoints: isCorrect ? params.points : 0,
    requiresManualGrading: false,
  };
};

/**
 * Calculates awarded points for a Theory answer using rubric criteria weights (0..1)
 * where each entry.score is a 0..100 mastery score for that criterion.
 */
export const computeRubricWeightedPoints = (
  maxPoints: number,
  rubrics: QuestionRubricCriterion[],
  breakdown: RubricScoreEntry[]
): number => {
  if (!rubrics.length || !breakdown.length) {
    return 0;
  }

  const scoreMap = new Map(breakdown.map((entry) => [entry.criterionId, entry.score]));
  let totalWeight = 0;
  let weightedPercent = 0;

  for (const rubric of rubrics) {
    const score = Math.max(0, Math.min(100, scoreMap.get(rubric.id) ?? 0));
    weightedPercent += score * rubric.weight;
    totalWeight += rubric.weight;
  }

  if (totalWeight <= 0) return 0;
  const normalizedRatio = weightedPercent / (totalWeight * 100);
  return Number((maxPoints * normalizedRatio).toFixed(2));
};
