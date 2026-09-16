import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { usePaperList } from "../lib/hooks";
import { db } from "../storage/db";
import type { Attempt } from "../lib/types";

function PaperCard({ paperId, title, year, version }: { paperId: string; title: string; year: number; version?: string }) {
  const attempts = useLiveQuery(() => db.attempts.where("paperId").equals(paperId).toArray(), [paperId]) ?? [];
  const fullSubmitted = attempts.filter((a: Attempt) => a.status === "submitted" && !a.parentAttemptId && a.score);
  const best = fullSubmitted.reduce<number | null>((max, a) => {
    const pct = (a.score!.correct / a.score!.total) * 100;
    return max === null ? pct : Math.max(max, pct);
  }, null);

  return (
    <Link
      to={`/paper/${paperId}`}
      className="tap-target flex flex-col gap-1 rounded-xl border border-slate-200 p-4 transition-colors hover:border-indigo-400 dark:border-slate-800 dark:hover:border-indigo-500"
    >
      <span className="font-semibold">
        {title} {version && <span className="text-slate-500 dark:text-slate-400">({version})</span>}
      </span>
      <span className="text-sm text-slate-500 dark:text-slate-400">
        {year} · {fullSubmitted.length} attempt{fullSubmitted.length === 1 ? "" : "s"}
        {best !== null && <> · best {Math.round(best)}%</>}
      </span>
    </Link>
  );
}

export function PaperListPage() {
  const { papers } = usePaperList();

  return (
    <Layout>
      <h1 className="mb-1 text-2xl font-bold">Practice papers</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        No account needed. Everything you do stays on this device — see Settings to back it up.
      </p>
      {papers === null && <p className="text-sm text-slate-500">Loading papers…</p>}
      {papers && papers.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">No papers are available yet.</p>
      )}
      <div className="flex flex-col gap-3">
        {papers?.map((p) => (
          <PaperCard key={p.id} paperId={p.id} title={p.title} year={p.year} version={p.version} />
        ))}
      </div>
    </Layout>
  );
}
