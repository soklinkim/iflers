import type { SkillBreakdownEntry, SkillTag } from "../lib/types";
import { skillLabel } from "../lib/scoring";

interface Props {
  entries: SkillBreakdownEntry[];
  onSelectSkill?: (skill: SkillTag) => void;
  selectedSkill?: SkillTag | null;
}

/**
 * Horizontal bar chart, one bar per skill with at least one missed question,
 * sorted by marks lost (most missed first, per scoreAttempt). Bar length is
 * accuracy (correct/total) so the weakest skills read as the shortest bars at
 * a glance — the plain list made a student read every number to find that out
 * (README §6.4). Rows stay clickable buttons so the skill filter below still works.
 */
export function SkillBreakdownChart({ entries, onSelectSkill, selectedSkill }: Props) {
  const withMisses = entries.filter((e) => e.missed > 0);
  if (withMisses.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No missed questions — nothing to break down.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 pl-[calc(7rem+0.75rem)] text-[10px] text-slate-400 sm:pl-[calc(10rem+0.75rem)] dark:text-slate-500" aria-hidden="true">
        <span className="relative h-3 flex-1">
          <span className="absolute left-0">0%</span>
          <span className="absolute left-1/2 -translate-x-1/2">50%</span>
          <span className="absolute right-0">100%</span>
        </span>
        <span className="w-12 shrink-0" />
      </div>
      <ul className="flex flex-col gap-2">
        {withMisses.map((e) => {
          const pct = e.total > 0 ? (e.correct / e.total) * 100 : 0;
          const isSelected = selectedSkill === e.skill;
          const label = skillLabel(e.skill);
          return (
            <li key={e.skill}>
              <button
                type="button"
                disabled={!onSelectSkill}
                onClick={() => onSelectSkill?.(e.skill)}
                title={`${e.correct}/${e.total} correct · ${e.missed} missed`}
                className={`tap-target flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2 text-left text-sm ${
                  isSelected ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950" : "border-slate-200 dark:border-slate-800"
                } ${onSelectSkill ? "cursor-pointer" : ""}`}
              >
                <span className="w-28 shrink-0 truncate font-medium sm:w-40">{label}</span>
                <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-slate-300 dark:bg-slate-700" />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right text-slate-500 dark:text-slate-400">
                  {e.correct}/{e.total}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
