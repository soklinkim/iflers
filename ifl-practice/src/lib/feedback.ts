import type { FlatQuestion, Mode } from "./types";

export type OptionVisualState = "neutral" | "selected" | "selected-correct" | "selected-incorrect" | "correct-unselected";

/**
 * Study mode reveals correctness the moment a question has an answer; exam mode never does.
 * The student's answer stays visible even when wrong, so they can see the contrast with the
 * correct option (README §6.1) — and it can still be changed, which simply re-evaluates live.
 */
export function shouldRevealFeedback(mode: Mode, answer: string | null | undefined): boolean {
  return mode === "study" && answer != null;
}

export function optionVisualState(
  mode: Mode,
  fq: FlatQuestion,
  answer: string | null | undefined,
  optionId: string,
): OptionVisualState {
  const reveal = shouldRevealFeedback(mode, answer);
  const isSelected = answer === optionId;
  if (!reveal) return isSelected ? "selected" : "neutral";

  const answeredCorrectly = answer === fq.question.answerId;
  if (isSelected) return answeredCorrectly ? "selected-correct" : "selected-incorrect";
  if (optionId === fq.question.answerId && !answeredCorrectly) return "correct-unselected";
  return "neutral";
}
