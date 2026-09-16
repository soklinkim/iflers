import type {
  Attempt,
  FlatQuestion,
  Paper,
  SectionBreakdownEntry,
  SkillBreakdownEntry,
  SkillTag,
} from "./types";
import { SKILLS } from "./types";

/** True only when the student's answer exactly matches the answer key. Unanswered (null) is always incorrect. */
export function isCorrect(fq: FlatQuestion, answer: string | null | undefined): boolean {
  return answer != null && answer === fq.question.answerId;
}

export interface ScoredAttempt {
  correct: number;
  total: number;
  missedQuestionIds: string[];
  sectionBreakdown: SectionBreakdownEntry[];
  skillBreakdown: SkillBreakdownEntry[];
}

/**
 * Score an attempt against the paper's answer key. Pure function — no clock, no storage —
 * so it is the same for a live submission and for re-deriving a past attempt's review.
 */
export function scoreAttempt(_paper: Paper, flat: FlatQuestion[], attempt: Attempt): ScoredAttempt {
  const included = new Set(attempt.questionIds);
  const questions = flat.filter((fq) => included.has(fq.question.id));

  let correct = 0;
  const missedQuestionIds: string[] = [];
  const sectionMap = new Map<string, SectionBreakdownEntry>();
  const skillMap = new Map<SkillTag, SkillBreakdownEntry>();

  for (const fq of questions) {
    const answer = attempt.answers[fq.question.id] ?? null;
    const ok = isCorrect(fq, answer);
    if (ok) correct += 1;
    else missedQuestionIds.push(fq.question.id);

    let sec = sectionMap.get(fq.section.id);
    if (!sec) {
      sec = { sectionId: fq.section.id, sectionTitle: fq.section.title, correct: 0, total: 0 };
      sectionMap.set(fq.section.id, sec);
    }
    sec.total += 1;
    if (ok) sec.correct += 1;

    for (const skill of fq.question.skills) {
      let entry = skillMap.get(skill);
      if (!entry) {
        entry = { skill, correct: 0, total: 0, missed: 0 };
        skillMap.set(skill, entry);
      }
      entry.total += 1;
      if (ok) entry.correct += 1;
      else entry.missed += 1;
    }
  }

  const skillBreakdown = [...skillMap.values()].sort((a, b) => b.missed - a.missed);
  const sectionBreakdown = [...sectionMap.values()];

  // Preserve printed question order in the missed list, not answer-loop order.
  const order = new Map(flat.map((fq, i) => [fq.question.id, i]));
  missedQuestionIds.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));

  return { correct, total: questions.length, missedQuestionIds, sectionBreakdown, skillBreakdown };
}

export function skillLabel(skill: SkillTag): string {
  return SKILLS[skill] ?? skill;
}
