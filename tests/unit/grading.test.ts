import { describe, expect, it } from "vitest";
import {
  autoGradeObjectiveAnswer,
  computeGradebookTotals,
  computeRubricWeightedPoints,
  computeWaecGrade,
} from "../../src/utils/grading.util";
import { requiresApprovalGate } from "../../src/services/exam.service";

describe("WAEC Grading, Auto-Grading & Hybrid Approval Gate", () => {
  it("computes WAEC A1-F9 grade scale accurately", () => {
    expect(computeWaecGrade(82)).toMatchObject({ gradeLetter: "A1", isPassed: true, isAtRisk: false });
    expect(computeWaecGrade(72)).toMatchObject({ gradeLetter: "B2", isPassed: true, isAtRisk: false });
    expect(computeWaecGrade(66)).toMatchObject({ gradeLetter: "B3", isPassed: true, isAtRisk: false });
    expect(computeWaecGrade(60)).toMatchObject({ gradeLetter: "C4", isPassed: true, isAtRisk: false });
    expect(computeWaecGrade(55)).toMatchObject({ gradeLetter: "C5", isPassed: true, isAtRisk: false });
    expect(computeWaecGrade(50)).toMatchObject({ gradeLetter: "C6", isPassed: true, isAtRisk: false });
    expect(computeWaecGrade(46)).toMatchObject({ gradeLetter: "D7", isPassed: false, isAtRisk: true });
    expect(computeWaecGrade(40)).toMatchObject({ gradeLetter: "E8", isPassed: false, isAtRisk: true });
    expect(computeWaecGrade(32)).toMatchObject({ gradeLetter: "F9", isPassed: false, isAtRisk: true });
  });

  it("aggregates CA1-CA4 + Terminal Exam totals for the gradebook", () => {
    const result = computeGradebookTotals({
      ca1Score: 8,
      ca2Score: 9,
      ca3Score: 7,
      ca4Score: 8,
      terminalExamScore: 48,
    });
    expect(result.totalCaScore).toBe(32);
    expect(result.grandTotal).toBe(80);
    expect(result.gradeLetter).toBe("A1");
    expect(result.isAtRisk).toBe(false);
  });

  it("auto-grades MCQ and normalized Fill-in-Blanks while flagging Theory for manual grading", () => {
    const mcqCorrect = autoGradeObjectiveAnswer({
      type: "mcq",
      points: 2,
      correctOptionId: "B",
      selectedOptionId: "B",
    });
    expect(mcqCorrect).toEqual({
      isCorrect: true,
      awardedPoints: 2,
      requiresManualGrading: false,
    });

    const fillCorrect = autoGradeObjectiveAnswer({
      type: "fill_blanks",
      points: 3,
      shortAnswer: "Photosynthesis",
      acceptedAnswers: ["photosynthesis"],
      textResponse: "  PHOTOSYNTHESIS  ",
    });
    expect(fillCorrect).toEqual({
      isCorrect: true,
      awardedPoints: 3,
      requiresManualGrading: false,
    });

    const theory = autoGradeObjectiveAnswer({
      type: "theory",
      points: 10,
      textResponse: "Detailed essay response...",
    });
    expect(theory).toEqual({
      isCorrect: null,
      awardedPoints: null,
      requiresManualGrading: true,
    });
  });

  it("computes rubric-weighted Theory scores accurately", () => {
    const awarded = computeRubricWeightedPoints(
      20,
      [
        { id: "r1", criterion: "Formula & Method", weight: 0.4 },
        { id: "r2", criterion: "Working Steps", weight: 0.4 },
        { id: "r3", criterion: "Final Answer", weight: 0.2 },
      ],
      [
        { criterionId: "r1", score: 100 },
        { criterionId: "r2", score: 75 },
        { criterionId: "r3", score: 50 },
      ]
    );
    // (100*0.4 + 75*0.4 + 50*0.2) = 80% of 20 = 16
    expect(awarded).toBe(16);
  });

  it("enforces hybrid approval gate: CA1-CA4 direct vs Terminal/Mock gated", () => {
    expect(requiresApprovalGate("CA1", "single_subject_ca")).toBe(false);
    expect(requiresApprovalGate("CA2", "two_subject_daily")).toBe(false);
    expect(requiresApprovalGate("Exam", "term_exam")).toBe(true);
    expect(requiresApprovalGate("CA3", "national_jamb_mock")).toBe(true);
  });
});
