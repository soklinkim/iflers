import type { FlatQuestion } from "../lib/types";

interface Props {
  questions: FlatQuestion[];
  answers: Record<string, string | null>;
  flagged: string[];
  currentQuestionId?: string;
  onJump: (questionId: string) => void;
}

/**
 * A grid of question numbers showing answered / unanswered / flagged state.
 * Essential on a 100-question paper — scrolling to find the three you skipped
 * is the most likely source of lost marks unrelated to English (README §6.6).
 */
export function QuestionNavigator({ questions, answers, flagged, currentQuestionId, onJump }: Props) {
  const flaggedSet = new Set(flagged);
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300">
        <Legend swatch="bg-indigo-600" label="Answered" />
        <Legend swatch="border-2 border-slate-300 dark:border-slate-600" label="Unanswered" />
        <Legend swatch="bg-amber-400" label="Flagged" />
        <Legend swatch="ring-2 ring-indigo-500" label="Current" />
      </div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
        {questions.map((fq) => {
          const answered = answers[fq.question.id] != null;
          const isFlagged = flaggedSet.has(fq.question.id);
          const isCurrent = fq.question.id === currentQuestionId;
          return (
            <button
              key={fq.question.id}
              type="button"
              onClick={() => onJump(fq.question.id)}
              aria-current={isCurrent}
              aria-label={`Question ${fq.question.n}${answered ? ", answered" : ", unanswered"}${isFlagged ? ", flagged" : ""}`}
              className={`tap-target relative flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                answered
                  ? "bg-indigo-600 text-white"
                  : "border-2 border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-200"
              } ${isCurrent ? "ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-950" : ""}`}
            >
              {fq.question.n}
              {isFlagged && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-sm ${swatch}`} aria-hidden="true" />
      {label}
    </span>
  );
}
