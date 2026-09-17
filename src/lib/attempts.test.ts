import { describe, expect, it } from "vitest";
import sample from "./__fixtures__/sample-paper.json";
import { createFullAttempt, createRetakeAttempt, isExpired, remainingMs, submitAttempt, unansweredCount } from "./attempts";
import { flattenPaper } from "./content";
import { scoreAttempt } from "./scoring";
import type { Paper } from "./types";

const paper = sample as Paper;
const flat = flattenPaper(paper);

describe("createFullAttempt", () => {
  it("includes every question and starts fully unanswered", () => {
    const attempt = createFullAttempt(paper, flat, "study");
    expect(attempt.questionIds).toHaveLength(flat.length);
    expect(unansweredCount(attempt)).toBe(flat.length);
    expect(attempt.status).toBe("in-progress");
  });

  it("sets a wall-clock expiry only in exam mode", () => {
    const study = createFullAttempt(paper, flat, "study");
    const exam = createFullAttempt(paper, flat, "exam");
    expect(study.expiresAt).toBeUndefined();
    expect(exam.expiresAt).toBe(exam.startedAt + paper.durationMinutes * 60_000);
  });
});

describe("timer expiry", () => {
  it("is not expired before expiresAt and expired at/after it", () => {
    const attempt = createFullAttempt(paper, flat, "exam");
    expect(isExpired(attempt, attempt.expiresAt! - 1000)).toBe(false);
    expect(isExpired(attempt, attempt.expiresAt!)).toBe(true);
    expect(isExpired(attempt, attempt.expiresAt! + 60_000)).toBe(true);
  });

  it("computes remaining time from the wall clock, not a tick count", () => {
    const attempt = createFullAttempt(paper, flat, "exam");
    const fiveMinutesIn = attempt.startedAt + 5 * 60_000;
    expect(remainingMs(attempt, fiveMinutesIn)).toBe((paper.durationMinutes - 5) * 60_000);
  });
});

describe("submitAttempt", () => {
  it("grades unanswered questions as incorrect and records the score", () => {
    const attempt = createFullAttempt(paper, flat, "exam");
    attempt.answers[flat[0].question.id] = flat[0].question.answerId;
    const submitted = submitAttempt(attempt, flat, { autoSubmitted: false });
    expect(submitted.status).toBe("submitted");
    expect(submitted.score).toEqual({ correct: 1, total: flat.length });
  });

  it("marks auto-submitted attempts as such", () => {
    const attempt = createFullAttempt(paper, flat, "exam");
    const submitted = submitAttempt(attempt, flat, { autoSubmitted: true });
    expect(submitted.autoSubmitted).toBe(true);
  });
});

describe("retake subsetting", () => {
  it("creates a retake covering exactly the missed questions and links back to the parent", () => {
    const parent = createFullAttempt(paper, flat, "exam");
    for (const f of flat) parent.answers[f.question.id] = null; // miss everything
    const submitted = submitAttempt(parent, flat, { autoSubmitted: false });
    const { missedQuestionIds } = scoreAttempt(paper, flat, submitted);

    const retake = createRetakeAttempt(submitted, missedQuestionIds, "study");
    expect(retake.parentAttemptId).toBe(submitted.id);
    expect(retake.questionIds).toEqual(missedQuestionIds);
    expect(new Set(retake.questionIds).size).toBe(retake.questionIds.length);
  });

  it("a retake with a duration scales its own timer rather than reusing the parent paper's full duration", () => {
    const parent = createFullAttempt(paper, flat, "exam");
    const submitted = submitAttempt(parent, flat, { autoSubmitted: false });
    const retake = createRetakeAttempt(submitted, [flat[0].question.id], "exam", 10);
    expect(retake.expiresAt! - retake.startedAt).toBe(10 * 60_000);
  });
});
