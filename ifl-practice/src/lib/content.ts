import type { FlatQuestion, Paper, PaperId, PaperStatus } from "./types";

/**
 * Every paper JSON in src/content/papers/, loaded lazily so a student only
 * downloads the paper they actually open. `status: "pending"` papers are
 * excluded unless the app is running in dev, so an accidental deploy can't
 * publish content without cleared permission (README §10).
 */
const paperModules = import.meta.glob<{ default: Paper }>(
  "../content/papers/*.json",
);

interface PaperManifestEntry {
  id: PaperId;
  path: string;
}

let manifestCache: PaperManifestEntry[] | null = null;

function manifest(): PaperManifestEntry[] {
  if (manifestCache) return manifestCache;
  manifestCache = Object.keys(paperModules).map((path) => ({
    id: path.split("/").pop()!.replace(/\.json$/, ""),
    path,
  }));
  return manifestCache;
}

const paperCache = new Map<PaperId, Paper>();

async function loadPaper(id: PaperId): Promise<Paper | null> {
  if (paperCache.has(id)) return paperCache.get(id)!;
  const entry = manifest().find((e) => e.id === id);
  if (!entry) return null;
  const mod = await paperModules[entry.path]();
  const paper = mod.default;
  paperCache.set(id, paper);
  return paper;
}

function isPublishable(status: PaperStatus): boolean {
  // Dev builds can exercise "pending" content; production must not ship it.
  return status === "cleared" || import.meta.env.DEV;
}

/** Paper summaries for the paper list — loads every paper (they're small) but not their content weight beyond that. */
export async function listPapers(): Promise<Paper[]> {
  const papers = await Promise.all(manifest().map((e) => loadPaper(e.id)));
  return papers
    .filter((p): p is Paper => p !== null && isPublishable(p.status))
    .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}

export async function getPaper(id: PaperId): Promise<Paper | null> {
  const paper = await loadPaper(id);
  if (!paper || !isPublishable(paper.status)) return null;
  return paper;
}

/** Flatten a paper's sections/groups into an ordered list of questions with resolved options. */
export function flattenPaper(paper: Paper): FlatQuestion[] {
  const flat: FlatQuestion[] = [];
  for (const section of paper.sections) {
    for (const group of section.groups) {
      for (const question of group.questions) {
        flat.push({
          question,
          group,
          section,
          options: question.options ?? group.sharedOptions ?? [],
        });
      }
    }
  }
  return flat.sort((a, b) => a.question.n - b.question.n);
}

export function findQuestion(
  flat: FlatQuestion[],
  questionId: string,
): FlatQuestion | undefined {
  return flat.find((f) => f.question.id === questionId);
}
