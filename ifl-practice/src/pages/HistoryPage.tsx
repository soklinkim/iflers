import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ScoreChart } from "../components/ScoreChart";
import { formatDate } from "../lib/format";
import { useAttempts, usePaper } from "../lib/hooks";

export function HistoryPage() {
  const { id } = useParams<{ id: string }>();
  const { paper } = usePaper(id);
  const attempts = useAttempts(id);

  if (paper === undefined) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Loading…</p>
      </Layout>
    );
  }
  if (paper === null) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Paper not found.</p>
      </Layout>
    );
  }

  const sorted = [...attempts].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <Layout>
      <Link to={`/paper/${paper.id}`} className="text-sm text-indigo-600 dark:text-indigo-400">
        ← {paper.title}
      </Link>
      <h1 className="mt-2 mb-4 text-2xl font-bold">Attempt history</h1>

      <section className="mb-6">
        <ScoreChart attempts={attempts} />
      </section>

      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No attempts yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((a) => (
            <li key={a.id}>
              <Link
                to={a.status === "in-progress" ? `/paper/${paper.id}/attempt/${a.id}` : `/paper/${paper.id}/attempt/${a.id}/review`}
                className="tap-target flex items-center justify-between rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-800"
              >
                <span>
                  {formatDate(a.startedAt)} · {a.mode}
                  {a.parentAttemptId ? " (retake)" : ""}
                  {a.autoSubmitted ? " · auto-submitted" : ""}
                  {a.status === "in-progress" && " · in progress"}
                </span>
                <span className="font-semibold">{a.score ? `${a.score.correct}/${a.score.total}` : "—"}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  );
}
