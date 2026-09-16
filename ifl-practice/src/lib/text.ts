export type InlineToken =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "gap"; n: number };

/** Splits stimulus text into plain/bold/gap tokens. Gap markers are `{{n}}`; bold spans are `**text**`. */
export function tokenizeStimulusText(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const gapSplit = text.split(/(\{\{\d+\}\})/g);
  for (const part of gapSplit) {
    const gapMatch = part.match(/^\{\{(\d+)\}\}$/);
    if (gapMatch) {
      tokens.push({ type: "gap", n: Number(gapMatch[1]) });
      continue;
    }
    if (part === "") continue;
    const boldSplit = part.split(/(\*\*[^*]+\*\*)/g);
    for (const seg of boldSplit) {
      if (seg === "") continue;
      const boldMatch = seg.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch) tokens.push({ type: "bold", value: boldMatch[1] });
      else tokens.push({ type: "text", value: seg });
    }
  }
  return tokens;
}
