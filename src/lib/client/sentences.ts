/** Segment for presentation only; joining these pieces restores the exact text. */
export function splitSentences(text: string): string[] {
  if (!text) return [];
  if (typeof Intl.Segmenter !== "function") return [text];
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  return Array.from(segmenter.segment(text), sentence => sentence.segment);
}
