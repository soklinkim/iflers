import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { flattenPaper, getPaper, listPapers } from "./content";
import { db } from "../storage/db";
import type { Attempt, FlatQuestion, Paper } from "./types";

export function usePaperList(): { papers: Paper[] | null } {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    listPapers().then((p) => !cancelled && setPapers(p));
    return () => {
      cancelled = true;
    };
  }, []);
  return { papers };
}

export function usePaper(paperId: string | undefined): {
  paper: Paper | null | undefined; // undefined = loading, null = not found
  flat: FlatQuestion[];
} {
  const [paper, setPaper] = useState<Paper | null | undefined>(undefined);
  useEffect(() => {
    if (!paperId) return;
    let cancelled = false;
    setPaper(undefined);
    getPaper(paperId).then((p) => !cancelled && setPaper(p));
    return () => {
      cancelled = true;
    };
  }, [paperId]);
  const flat = paper ? flattenPaper(paper) : [];
  return { paper, flat };
}

/** Live (reactive) list of attempts for a paper — updates as attempts are saved. */
export function useAttempts(paperId: string | undefined): Attempt[] {
  return (
    useLiveQuery(() => (paperId ? db.attempts.where("paperId").equals(paperId).sortBy("startedAt") : []), [paperId]) ?? []
  );
}

/** undefined = still loading, null = no such attempt. */
export function useAttempt(attemptId: string | undefined): Attempt | null | undefined {
  const live = useLiveQuery(() => (attemptId ? db.attempts.get(attemptId) : undefined), [attemptId]);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    setChecked(false);
    if (!attemptId) return;
    db.attempts.get(attemptId).then(() => setChecked(true));
  }, [attemptId]);

  if (!attemptId) return null;
  if (live) return live;
  return checked ? null : undefined;
}
