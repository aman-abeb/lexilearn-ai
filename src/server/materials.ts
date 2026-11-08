import { createHash, randomUUID } from "node:crypto";
import type { Course, CreateLectureInput, CreateMaterialInput, LectureSource, LectureSourceInput, Material, MaterialSection } from "../lib/contracts";

export function courseIdForName(name: string): string {
  return `course-${createHash("sha256").update(name.trim().toLowerCase()).digest("hex").slice(0, 16)}`;
}

/** Mechanical paragraph grouping only. This never rewrites academic content. */
export function splitIntoSections(sourceText: string): MaterialSection[] {
  const paragraphs = sourceText.split(/\r?\n\s*\r?\n/).map((text) => text.trim()).filter(Boolean);
  return paragraphs.map((text, index) => ({
    id: `section-${index + 1}`,
    title: `Part ${index + 1}`,
    text,
    sourceLabel: `Original text · paragraph ${index + 1}`,
  }));
}

export function createMaterial(input: CreateMaterialInput): Material {
  const source = createSource({ kind: "notes", name: input.sourceName ?? "Pasted lecture notes", text: input.sourceText });
  return {
    id: randomUUID(),
    title: input.title,
    course: input.course,
    sourceName: input.sourceName ?? "Pasted lecture notes",
    sourceText: input.sourceText,
    sections: splitIntoSections(input.sourceText).map(section => ({ ...section, sourceIds: [source.id] })),
    wordCount: input.sourceText.trim().split(/\s+/u).filter(Boolean).length,
    createdAt: new Date().toISOString(),
    isSample: false,
    courseId: courseIdForName(input.course),
    lectureNumber: 1,
    sources: [source],
    compilation: null,
  };
}

export function createSource(input: LectureSourceInput): LectureSource {
  return { ...input, id: randomUUID(), addedAt: new Date().toISOString() };
}

export function sourceSections(sources: LectureSource[]): MaterialSection[] {
  return sources.flatMap(source => splitIntoSections(source.text).map((section, index) => ({
    ...section,
    id: `${source.id}-part-${index + 1}`,
    title: `Part ${index + 1} · ${source.name}`,
    sourceLabel: `${source.name} · passage ${index + 1}`,
    sourceIds: [source.id],
  })));
}

export function withSources(material: Material, sources: LectureSource[]): Material {
  const sourceText = sources.filter(source => source.text.trim()).map(source => source.text).join("\n\n");
  return {
    ...material, sources, sourceText,
    sections: sourceSections(sources),
    sourceName: `${sources.length} lecture ${sources.length === 1 ? "source" : "sources"}`,
    wordCount: sourceText.trim() ? sourceText.trim().split(/\s+/u).length : 0,
  };
}

export function createLecture(input: CreateLectureInput, course: Course, lectureNumber: number): Material {
  const material: Material = {
    id: randomUUID(), title: input.title, course: course.name, courseId: course.id,
    lectureNumber, sourceName: "", sourceText: "", sections: [], sources: [], compilation: null,
    wordCount: 0, isSample: false, createdAt: new Date().toISOString(),
  };
  return withSources(material, input.sources.map(createSource));
}
