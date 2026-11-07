import type { Material, SourceKind } from "./contracts";
import { parseYouTubeUrl } from "./youtube";

export const SOURCE_LABELS: Record<SourceKind, string> = {
  notes: "Lecture notes", slides: "Slides", recording: "Recording", transcript: "Transcript",
};

export function looksLikeSlideText(text: string): boolean {
  const headings = text.match(/^\s*Slide\s+\d+\b/gmi) ?? [];
  return headings.length >= 2 || (headings.length > 0 && /^\s*Speaker note:/mi.test(text));
}

export function recordingLinkHelp(value: string): string {
  if (parseYouTubeUrl(value)) return "YouTube captions are imported automatically when available. Review the transcript, then create study notes from it. The whole video is included.";
  try {
    const url = new URL(value);
    if (url.hostname === "elearning.unimib.it" && url.pathname.startsWith("/mod/kalvidres/")) {
      return "This is a UniMiB Moodle / Kaltura lecture page. It requires university sign-in. Saving keeps the link; it does not import the recording. Add an exported transcript to include the spoken lecture.";
    }
  } catch { /* Show the general guidance while a link is being entered. */ }
  return "Paste a YouTube link to import available captions. Webex, Kaltura, and university links are saved as references; add their transcript below to include the spoken lecture.";
}

export function readingMaterial(material: Material): Material {
  return material.compilation ? { ...material, sections: material.compilation.sections } : material;
}

export function compilationIsCurrent(material: Material): boolean {
  return !!material.compilation && material.sources.every(source => material.compilation!.sourceIds.includes(source.id) && (!material.compilation!.sourceVersions || material.compilation!.sourceVersions[source.id] === (source.updatedAt ?? source.addedAt)));
}

export function lectureStatus(material: Material): string {
  if (material.compilation) return compilationIsCurrent(material) ? "Study notes ready" : "New sources added";
  return material.sources.some(source => source.text.trim()) ? "Ready to compile" : "Needs a transcript";
}
