import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SKILLS } from "../src/lib/types";

const DIR = "src/content/papers";
const errors: string[] = [];

function fail(paper: string, msg: string) {
  errors.push(`[${paper}] ${msg}`);
}

for (const file of readdirSync(DIR).filter(f => f.endsWith(".json"))) {
  const paper = JSON.parse(readFileSync(join(DIR, file), "utf8"));
  const name = paper.id ?? file;

  const questions = paper.sections.flatMap((s: any) =>
    s.groups.flatMap((g: any) =>
      g.questions.map((q: any) => ({ ...q, group: g }))
    )
  );

  // Count matches declaration
  if (questions.length !== paper.totalQuestions) {
    fail(name, `totalQuestions is ${paper.totalQuestions} but found ${questions.length}`);
  }

  // Numbers are unique and sequential from 1
  const numbers = questions.map((q: any) => q.n).sort((a: number, b: number) => a - b);
  numbers.forEach((n: number, i: number) => {
    if (n !== i + 1) fail(name, `question numbering breaks at ${n} (expected ${i + 1})`);
  });

  const seenIds = new Set<string>();
  for (const q of questions) {
    if (seenIds.has(q.id)) fail(name, `duplicate question id ${q.id}`);
    seenIds.add(q.id);

    // Answer key resolves to a real option
    const opts = q.options ?? q.group.sharedOptions;
    if (!opts) {
      fail(name, `q${q.n} has neither options nor group sharedOptions`);
    } else if (!opts.some((o: any) => o.id === q.answerId)) {
      fail(name, `q${q.n} answerId "${q.answerId}" is not one of its options`);
    }

    // Skills present and known
    if (!q.skills?.length) {
      fail(name, `q${q.n} has no skill tags`);
    } else {
      for (const s of q.skills) {
        if (!(s in SKILLS)) fail(name, `q${q.n} has unknown skill tag "${s}"`);
      }
    }
  }

  // Cloze gap markers match questions
  for (const section of paper.sections) {
    for (const group of section.groups) {
      if (group.type !== "cloze") continue;
      const text = group.stimulus.blocks.map((b: any) => b.text).join(" ");
      const markers = [...text.matchAll(/\{\{(\d+)\}\}/g)].map(m => Number(m[1]));
      const qNums = group.questions.map((q: any) => q.n);

      for (const m of markers) {
        if (!qNums.includes(m)) fail(name, `gap {{${m}}} has no matching question`);
      }
      for (const n of qNums) {
        if (!markers.includes(n)) fail(name, `q${n} is cloze but has no {{${n}}} marker`);
      }
    }
  }

  // Options used once must not repeat in the key
  for (const section of paper.sections) {
    for (const group of section.groups) {
      if (!group.optionUseOnce) continue;
      const used = group.questions.map((q: any) => q.answerId);
      const dupes = used.filter((a: string, i: number) => used.indexOf(a) !== i);
      if (dupes.length) fail(name, `group ${group.id} reuses option(s) ${[...new Set(dupes)].join(", ")}`);
    }
  }
}

if (errors.length) {
  console.error(`\n${errors.length} content error(s):\n`);
  errors.forEach(e => console.error("  " + e));
  process.exit(1);
}
console.log("Content OK");