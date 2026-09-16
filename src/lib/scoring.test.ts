import { describe, expect, it } from "vitest";
import sample from "../content/papers/sample.json";
import { flattenPaper } from "./content";
import { scoreAttempt } from "./scoring";
import type { Attempt, Paper } from "./types";

const paper = sample as Paper;
const flat = flattenPaper(paper);

function baseAttempt(answers: Record<string, string | null>): Attempt {
  return {
    id: "test-attempt",
    paperId: paper.id,
    mode: "exam",
    questionIds: flat.map((f) => f.question.id),
    startedAt: 0,
    autoSubmitted: false,
    status: "submitted",
    answers,
    flagged: [],
  };
}

describe("scoreAttempt", () => {
  it("scores a fully correct attempt as all correct", () => {
    const answers = Object.fromEntries(flat.map((f) => [f.question.id, f.question.answerId]));
    const result = scoreAttempt(paper, flat, baseAttempt(answers));
    expect(result.correct).toBe(result.total);
    expect(result.missedQuestionIds).toHaveLength(0);
  });

  it("grades unanswered questions as incorrect", () => {
    const answers = Object.fromEntries(flat.map((f) => [f.question.id, null]));
    const result = scoreAttempt(paper, flat, baseAttempt(answers));
    expect(result.correct).toBe(0);
    expect(result.missedQuestionIds).toHaveLength(flat.length);
  });

  it("handles a partially answered attempt and preserves printed question order in the missed list", () => {
    const answers: Record<string, string | null> = Object.fromEntries(
      flat.map((f) => [f.question.id, null]),
    );
    // Answer only the last question correctly.
    const last = flat[flat.length - 1];
    answers[last.question.id] = last.question.answerId;

    const result = scoreAttempt(paper, flat, baseAttempt(answers));
    expect(result.correct).toBe(1);
    expect(result.missedQuestionIds).toEqual(
      flat.slice(0, -1).map((f) => f.question.id),
    );
  });

  it("only scores the questions included in the attempt (a retake's missed subset)", () => {
    const subset = flat.slice(0, 2).map((f) => f.question.id);
    const answers = Object.fromEntries(subset.map((id) => [id, flat.find((f) => f.question.id === id)!.question.answerId]));
    const attempt: Attempt = { ...baseAttempt(answers), questionIds: subset };
    const result = scoreAttempt(paper, flat, attempt);
    expect(result.total).toBe(2);
    expect(result.correct).toBe(2);
  });

  it("ranks skill breakdown by most marks missed first", () => {
    const answers = Object.fromEntries(flat.map((f) => [f.question.id, null]));
    const result = scoreAttempt(paper, flat, baseAttempt(answers));
    for (let i = 1; i < result.skillBreakdown.length; i++) {
      expect(result.skillBreakdown[i - 1].missed).toBeGreaterThanOrEqual(result.skillBreakdown[i].missed);
    }
  });
});
