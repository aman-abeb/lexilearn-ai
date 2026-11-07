/** Remove caption labels and speech disfluencies without rewriting lecture content. */
export function cleanTranscript(text: string): string {
  return text
    .replace(/\[\s*\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?\s*\]/g, "")
    .replace(/^[ \t]*\d{1,3}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?[ \t]+/gm, "")
    // Word boundaries alone would also match parts of hyphenated terms.
    .replace(/(?<![\p{L}\p{N}_’'-])(?:[uU]h+|[uU]m+|[eE]rm+)(?![\p{L}\p{N}_’'-])[,;:]?[ \t]*/gu, "")
    // Only remove "oh" as a punctuated interjection; retain terms such as OH.
    .replace(/(^[ \t]*|[.!?,;:][ \t]*)oh[ \t]*[,;:!?][ \t]*/gim, "$1")
    .replace(/(^[ \t]*|[,;:][ \t]*)you know,[ \t]*/gim, "$1")
    // Collapse transcribed stutters ("and- and- and"), not deliberate repetition.
    .replace(/\b([a-z]+)(?:-[ \t]+\1\b)+-?/gi, "$1")
    .split(/\r?\n\s*\r?\n/)
    .map(paragraph => paragraph
      .replace(/\s+/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/([,;:])(?:\s*[,;:])+/g, "$1")
      .replace(/[,;:]\s*([.!?])/g, "$1")
      .replace(/^[\s,;:]+|[\s,;:]+$/g, "")
      .trim())
    .filter(paragraph => paragraph && !/^[.!?]+$/.test(paragraph))
    .join("\n\n");
}
