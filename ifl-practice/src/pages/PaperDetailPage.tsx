import { useNavigate, useParams, Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { ScoreChart } from "../components/ScoreChart";
import { usePaper, useAttempts } from "../lib/hooks";
import { createFullAttempt } from "../lib/attempts";
import { attemptStore } from "../storage";
import { formatDate } from "../lib/format";
import type { Mode } from "../lib/types";

export function PaperDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { paper, flat } = usePaper(id);
  const attempts = useAttempts(id);
  const navigate = useNavigate();

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
        <Link to="/" className="text-indigo-600 dark:text-indigo-400">
          Back to papers
        </Link>
      </Layout>
    );
  }

  async function start(mode: Mode) {
    const attempt = createFullAttempt(paper!, flat, mode);
    await attemptStore.saveAttempt(attempt);
    navigate(`/paper/${paper!.id}/attempt/${attempt.id}`);
  }

  const inProgress = attempts.filter((a) => a.status === "in-progress");
  const recentSubmitted = attempts
    .filter((a) => a.status === "submitted")
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))
    .slice(0, 5);

  return (
    <Layout>
      <h1 className="text-2xl font-bold">{paper.title}</h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {paper.year} · {paper.totalQuestions} questions · {paper.durationMinutes} min · source: {paper.source}
      </p>

      {inProgress.length > 0 && (
        <div className="mb-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">You have an attempt in progress.</p>
          {inProgress.map((a) => (
            <Link
              key={a.id}
              to={`/paper/${paper.id}/attempt/${a.id}`}
              className="tap-target inline-flex w-fit items-center rounded-lg bg-amber-600 px-3 text-sm font-medium text-white"
            >
              Resume {a.mode} attempt
            </Link>
          ))}
        </div>
      )}

      <div className="mb-6 flex gap-3">
        <button
          type="button"
          onClick={() => start("study")}
          className="tap-target flex-1 rounded-lg bg-slate-100 px-4 font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100"
        >
          Study mode
        </button>
        <button
          type="button"
          onClick={() => start("exam")}
          className="tap-target flex-1 rounded-lg bg-indigo-600 px-4 font-medium text-white"
        >
          Exam mode
        </button>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-lg font-semibold">Score history</h2>
        <ScoreChart attempts={attempts} />
        <Link to={`/paper/${paper.id}/history`} className="mt-2 inline-block text-sm text-indigo-600 dark:text-indigo-400">
          View full history →
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Recent attempts</h2>
        {recentSubmitted.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No submitted attempts yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentSubmitted.map((a) => (
              <li key={a.id}>
                <Link
                  to={`/paper/${paper.id}/attempt/${a.id}/review`}
                  className="tap-target flex items-center justify-between rounded-lg border border-slate-200 px-3 text-sm dark:border-slate-800"
                >
                  <span>
                    {formatDate(a.startedAt)} · {a.mode}
                    {a.parentAttemptId ? " (retake)" : ""}
                    {a.autoSubmitted ? " · auto-submitted" : ""}
                  </span>
                  <span className="font-semibold">
                    {a.score ? `${a.score.correct}/${a.score.total}` : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}
