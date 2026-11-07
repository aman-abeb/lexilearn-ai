import { cleanTranscript } from "../transcript";
import { splitSentences } from "./sentences";
import { MAX_SPEECH_CHARACTERS } from "../speech";

export const SPEECH_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

/** Short, sentence-aware utterances keep long lectures flowing reliably. */
export function speechChunks(text: string): string[] {
  const cleaned = cleanTranscript(text);
  const chunks: string[] = [];
  for (const paragraph of cleaned.split(/\n\n/)) {
    for (const sentence of splitSentences(paragraph)) {
      let remaining = sentence.trim();
      while (remaining.length > 240) {
        const clause = remaining.slice(0, 241);
        const punctuation = Math.max(clause.lastIndexOf(", "), clause.lastIndexOf("; "), clause.lastIndexOf(": "));
        const space = clause.lastIndexOf(" ");
        const end = punctuation >= 80 ? punctuation + 1 : space > 0 ? space : 240;
        chunks.push(remaining.slice(0, end).trim());
        remaining = remaining.slice(end).trim();
      }
      if (remaining) chunks.push(remaining);
    }
  }
  return chunks;
}

/** Batch sentences into API-sized passages rather than making a call per sentence. */
export function audioChunks(text: string): string[] {
  const passages: string[] = [];
  let passage = "";
  for (const paragraph of cleanTranscript(text).split(/\n\n/)) {
    let firstSentence = true;
    for (const sentence of speechChunks(paragraph)) {
      const separator = firstSentence ? "\n\n" : " ";
      if (passage && passage.length + sentence.length + separator.length > MAX_SPEECH_CHARACTERS) {
        passages.push(passage); passage = "";
      }
      passage += (passage ? separator : "") + sentence;
      firstSentence = false;
    }
  }
  if (passage) passages.push(passage);
  return passages;
}
