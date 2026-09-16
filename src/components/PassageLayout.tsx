import { useState, type ReactNode } from "react";

/**
 * Splits a passage from its questions. On narrow screens a tab toggle switches
 * between the two (scrolling back and forth between a 400-word passage and its
 * questions is the worst part of doing this on a phone — README §8); on wider
 * screens the passage sticks alongside the questions instead.
 */
export function PassageLayout({ passage, questions }: { passage: ReactNode; questions: ReactNode }) {
  const [tab, setTab] = useState<"passage" | "questions">("passage");

  return (
    <div>
      <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 sm:hidden dark:bg-slate-900" role="tablist">
        {(["passage", "questions"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`tap-target flex-1 rounded-md text-sm font-medium capitalize transition-colors ${
              tab === t
                ? "bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className={`${tab === "passage" ? "block" : "hidden"} sm:block sm:sticky sm:top-20 sm:self-start sm:max-h-[calc(100vh-6rem)] sm:overflow-y-auto`}>
          {passage}
        </div>
        <div className={tab === "questions" ? "block" : "hidden sm:block"}>{questions}</div>
      </div>
    </div>
  );
}
