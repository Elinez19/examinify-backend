import { describe, expect, it } from "vitest";
import { sanitizeQuestionForActiveAttempt } from "../../src/utils/cbt-sanitizer.util";
import { redactSensitiveValue } from "../../src/utils/logger";

describe("CBT Answer-Key Sanitizer & PII Log Redaction", () => {
  it("strips all answer keys, model answers, rubrics, and explanations from active CBT payloads", () => {
    const sanitized = sanitizeQuestionForActiveAttempt(
      {
        id: "q-1",
        examId: "ex-1",
        sectionId: "sec-1",
        subjectId: "sub-1",
        questionNumber: 1,
        type: "mcq",
        prompt: "What is 6 x 7?",
        contextSnippet: null,
        imageUrl: "https://res.cloudinary.com/demo/image/upload/diagram.png",
        imageCaption: "Fig 1.1",
        options: [
          { id: "A", label: "A", text: "36" },
          { id: "B", label: "B", text: "42" },
          { id: "C", label: "C", text: "48" },
        ],
        correctOptionId: "B",
        shortAnswer: "42",
        acceptedAnswers: ["42"],
        theoryAnswer: "Multiply 6 by 7.",
        rubrics: [{ id: "r1", criterion: "Accuracy", weight: 1 }],
        points: "5.00",
        explanation: "6 x 7 = 42.",
      },
      ["C", "A", "B"]
    );

    expect(sanitized).not.toHaveProperty("correctOptionId");
    expect(sanitized).not.toHaveProperty("shortAnswer");
    expect(sanitized).not.toHaveProperty("acceptedAnswers");
    expect(sanitized).not.toHaveProperty("theoryAnswer");
    expect(sanitized).not.toHaveProperty("rubrics");
    expect(sanitized).not.toHaveProperty("explanation");
    expect(sanitized.points).toBe(5);
    expect(sanitized.options?.map((o) => o.id)).toEqual(["C", "A", "B"]);
  });

  it("recursively redacts secrets, tokens, passwords, pins, and guardian PII in logs", () => {
    const cleaned = redactSensitiveValue({
      username: "admin.guzape",
      password: "SuperSecretPassword!",
      accessPin: "123456",
      headers: {
        authorization: "Bearer xyz",
        cookie: "better-auth.session_token=abc",
      },
      guardianPhone: "+2348030001122",
      nested: {
        otpCode: "998877",
        safeField: "ok",
      },
    }) as Record<string, unknown>;

    expect(cleaned.username).toBe("admin.guzape");
    expect(cleaned.password).toBe("[REDACTED]");
    expect(cleaned.accessPin).toBe("[REDACTED]");
    expect((cleaned.headers as Record<string, unknown>).authorization).toBe("[REDACTED]");
    expect((cleaned.headers as Record<string, unknown>).cookie).toBe("[REDACTED]");
    expect(cleaned.guardianPhone).toBe("[REDACTED]");
    expect((cleaned.nested as Record<string, unknown>).otpCode).toBe("[REDACTED]");
    expect((cleaned.nested as Record<string, unknown>).safeField).toBe("ok");
  });
});
