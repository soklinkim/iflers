import type { Attempt, FlatQuestion, Mode, Paper } from "./types";
import { isCorrect } from "./scoring";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older WebViews).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createFullAttempt(paper: Paper, flat: FlatQuestion[], mode: Mode): Attempt {
  const now = Date.now();
  const questionIds = flat.map((f) => f.question.id);
  return {
    id: uuid(),
    paperId: paper.id,
    mode,
    questionIds,
    startedAt: now,
    expiresAt: mode === "exam" ? now + paper.durationMinutes * 60_000 : undefined,
    autoSubmitted: false,
    status: "in-progress",
    answers: Object.fromEntries(questionIds.map((id) => [id, null])),
    flagged: [],
  };
}

/** Retake covering only the questions missed in `parent`. Never appears as a standalone point on the score chart (README §6.5). */
export function createRetakeAttempt(
  parent: Attempt,
  missedQuestionIds: string[],
  mode: Mode,
  durationMinutes?: number,
): Attempt {
  const now = Date.now();
  return {
    id: uuid(),
    paperId: parent.paperId,
    mode,
    parentAttemptId: parent.id,
    questionIds: [...missedQuestionIds],
    startedAt: now,
    expiresAt: mode === "exam" && durationMinutes ? now + durationMinutes * 60_000 : undefined,
    autoSubmitted: false,
    status: "in-progress",
    answers: Object.fromEntries(missedQuestionIds.map((id) => [id, null])),
    flagged: [],
  };
}

export function remainingMs(attempt: Attempt, now: number = Date.now()): number {
  if (!attempt.expiresAt) return Infinity;
  return Math.max(0, attempt.expiresAt - now);
}

export function isExpired(attempt: Attempt, now: number = Date.now()): boolean {
  return attempt.expiresAt != null && now >= attempt.expiresAt;
}

/** Grades unanswered questions as incorrect implicitly — score is derived from `answers`, never assumed. */
export function submitAttempt(
  attempt: Attempt,
  flat: FlatQuestion[],
  opts: { autoSubmitted: boolean; now?: number },
): Attempt {
  const now = opts.now ?? Date.now();
  const included = new Set(attempt.questionIds);
  const questions = flat.filter((f) => included.has(f.question.id));
  const correct = questions.filter((fq) => isCorrect(fq, attempt.answers[fq.question.id])).length;

  return {
    ...attempt,
    submittedAt: now,
    autoSubmitted: opts.autoSubmitted,
    status: "submitted",
    score: { correct, total: questions.length },
  };
}

export function unansweredCount(attempt: Attempt): number {
  return attempt.questionIds.filter((id) => attempt.answers[id] == null).length;
}
