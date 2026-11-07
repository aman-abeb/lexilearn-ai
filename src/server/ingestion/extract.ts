import { posix } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { ExtractedSourceResponse } from "../../lib/contracts";
import { MAX_SOURCE_CHARACTERS } from "../../lib/validation";
import { HttpError } from "../http";
import { cleanTranscript } from "../../lib/transcript";

export const MAX_FILE_BYTES = 10_000_000;
const fileError = (message: string) => new HttpError(422, "EXTRACTION_FAILED", message);

/** Import captions as clean reading text, without timing or file metadata. */
export function captionText(text: string): string {
  return cleanTranscript(text.replace(/^\uFEFF/, "").split(/\r?\n\s*\r?\n/).flatMap(block => {
    const lines = block.split(/\r?\n/);
    const timeIndex = lines.findIndex(line => /\d{2}:\d{2}[.,]\d{3}\s*-->/.test(line));
    if (timeIndex < 0) return [];
    const words = lines.slice(timeIndex + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    return words ? [words] : [];
  }).join("\n\n"));
}

function isTemplatePlaceholder(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isTemplatePlaceholder);
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  const attributes = node[":@"] as Record<string, string> | undefined;
  if ("p:ph" in node && ["sldNum", "hdr", "ftr", "dt"].includes(attributes?.["@_type"] ?? "")) return true;
  return Object.entries(node).some(([key, child]) => key !== ":@" && isTemplatePlaceholder(child));
}

function paragraphText(nodes: unknown): string[] {
  if (!Array.isArray(nodes)) return [];
  const pieces: string[] = [];
  function literalText(value: unknown): string {
    if (Array.isArray(value)) return value.map(literalText).join("");
    if (!value || typeof value !== "object") return "";
    return Object.entries(value).map(([key, child]) => key === "#text" ? String(child) : key === ":@" ? "" : literalText(child)).join("");
  }
  function textOf(value: unknown): string {
    if (Array.isArray(value)) return value.map(textOf).join("");
    if (!value || typeof value !== "object") return "";
    const node = value as Record<string, unknown>;
    const attributes = node[":@"] as Record<string, string> | undefined;
    if ("a:fld" in node && attributes?.["@_type"] === "slidenum") return "";
    return Object.entries(node).map(([key, entry]) => key === "a:t" ? literalText(entry) : key === "a:br" ? "\n" : key === "a:tab" ? "\t" : key === ":@" || key === "#text" ? "" : textOf(entry)).join("");
  }
  for (const node of nodes as Record<string, unknown>[]) {
    for (const [key, value] of Object.entries(node)) {
      if (key === "p:sp" && isTemplatePlaceholder(value)) continue;
      if (key === "a:p") { const text = textOf(value).trim(); if (text) pieces.push(text); }
      else if (key !== ":@") pieces.push(...paragraphText(value));
    }
  }
  return pieces;
}

export function extractSlides(bytes: Uint8Array): string {
  let expanded = 0;
  const files = unzipSync(bytes, { filter(file) {
    const needed = /^ppt\/(slides\/(?:_rels\/)?slide\d+\.xml(?:\.rels)?|notesSlides\/notesSlide\d+\.xml|presentation\.xml|_rels\/presentation\.xml\.rels)$/.test(file.name);
    if (needed) {
      expanded += file.originalSize;
      if (file.originalSize > 2_000_000 || expanded > 16_000_000) throw fileError("This slide deck is too large to extract. Export a smaller PDF or text file.");
    }
    return needed;
  } });
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, processEntities: true });
  // A formatted word may span multiple runs. Keep the spaces inside a:t nodes;
  // XML indentation outside those nodes is not part of the displayed text.
  const ordered = new XMLParser({ preserveOrder: true, ignoreAttributes: false, parseTagValue: false, trimValues: false });
  const xml = (name: string) => {
    if (!files[name]) return "";
    const content = strFromU8(files[name]);
    if (content.includes("<!DOCTYPE") || XMLValidator.validate(content) !== true) throw fileError("This slide deck contains unreadable XML. Export it as PDF or text instead.");
    return content;
  };
  const asArray = <T,>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
  const presentation = xml("ppt/presentation.xml");
  const relationships = xml("ppt/_rels/presentation.xml.rels");
  let paths: string[] = [];
  if (presentation && relationships) {
    const ids = asArray(parser.parse(presentation)["p:presentation"]?.["p:sldIdLst"]?.["p:sldId"]) as Record<string, string>[];
    const relations = asArray(parser.parse(relationships).Relationships?.Relationship) as Record<string, string>[];
    paths = ids.flatMap(id => {
      const relationship = relations.find(relation => relation["@_Id"] === id["@_r:id"]);
      return relationship ? [relationship["@_Target"].startsWith("/") ? relationship["@_Target"].slice(1) : posix.normalize(posix.join("ppt", relationship["@_Target"]))] : [];
    });
  }
  if (!paths.length) paths = Object.keys(files).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
  if (paths.length > 300) throw fileError("Use a slide deck with 300 slides or fewer.");
  let readableCharacters = 0;
  const text = paths.map((path, index) => {
    const content = xml(path);
    if (!content) throw fileError("A slide could not be read. Export this deck as PDF or text instead.");
    const words = paragraphText(ordered.parse(content));
    const relationPath = posix.join(posix.dirname(path), "_rels", `${posix.basename(path)}.rels`);
    const relationXml = xml(relationPath);
    if (relationXml) {
      const relations = asArray(parser.parse(relationXml).Relationships?.Relationship) as Record<string, string>[];
      const notes = relations.find(relation => relation["@_Type"]?.endsWith("/notesSlide"));
      if (notes) {
        const noteXml = xml(posix.normalize(posix.join(posix.dirname(path), notes["@_Target"])));
        if (noteXml) words.push(...paragraphText(ordered.parse(noteXml)).map(text => `Speaker note: ${text}`));
      }
    }
    readableCharacters += words.join("").length;
    return `Slide ${index + 1}\n${words.join("\n\n") || "[No selectable text on this slide]"}`;
  }).join("\n\n");
  if (readableCharacters < 10) throw fileError("This slide deck has no readable text. Add a text version or transcript instead.");
  return text;
}

export async function extractFile(file: File): Promise<ExtractedSourceResponse> {
  if (file.size > MAX_FILE_BYTES) throw new HttpError(413, "FILE_TOO_LARGE", "Choose a file smaller than 10 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const warnings: string[] = [];
  let text = "";
  try {
    if (["txt", "md", "vtt", "srt"].includes(extension ?? "")) {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (text.includes("\u0000")) throw fileError("Save this file as UTF-8 plain text and try again.");
      if (extension === "vtt" || extension === "srt") text = captionText(text);
    } else if (extension === "pptx") {
      text = extractSlides(bytes);
      warnings.push("Slide text and speaker notes were extracted. Diagrams, images, and visual equations need to be checked against the slides.");
    } else if (extension === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      try {
        const result = await parser.getText();
        if (result.total > 300) throw fileError("Use a PDF with 300 pages or fewer.");
        text = result.pages.map(page => `Page ${page.num}\n${page.text}`).join("\n\n");
        const empty = result.pages.filter(page => !page.text.trim());
        if (empty.length === result.total) throw fileError("This PDF has no selectable text. Add a text version or transcript instead.");
        if (empty.length) warnings.push(`${empty.length} PDF ${empty.length === 1 ? "page has" : "pages have"} no selectable text and need a text alternative.`);
        warnings.push("PDF text was extracted. Diagrams, images, and visual equations need to be checked against the original.");
      } finally { await parser.destroy(); }
    } else throw new HttpError(415, "UNSUPPORTED_FILE", "Choose a PDF, PPTX, TXT, MD, VTT, or SRT file.");
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw fileError("This file could not be read. Try a text export, or paste its content instead.");
  }
  if (text.trim().length < 10) throw fileError("This file has too little readable text. Paste its content or add a text version.");
  if (text.length > MAX_SOURCE_CHARACTERS) throw fileError("This file contains more than 100,000 characters. Split it into smaller files.");
  return { name: file.name.slice(0, 200), text, warnings };
}
