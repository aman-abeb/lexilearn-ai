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

const sampleText = `Machine learning is a way of finding patterns in examples. Instead of writing every rule by hand, we use data to train a model. A model is a mathematical system that uses these patterns to make a prediction about a new example.

In supervised learning, each training example includes an input and a known answer called a label. For example, an email can be paired with the label "spam" or "not spam". The model learns from these labelled examples. Classification means predicting a category, while regression means predicting a numerical value.

Training data is used to fit the model. Test data is kept separate and used to evaluate how well the model works on examples it did not train on. If the model memorizes the training examples but performs poorly on new ones, this is called overfitting.

Accuracy is the fraction of predictions that are correct. It can be misleading when categories are very uneven. If 950 of 1,000 emails are not spam, a model that always predicts "not spam" achieves 95% accuracy, even though it finds none of the spam. We need to choose evaluation measures that match the problem.`;

/** Illustrative fixture written for this starter, not an actual university lecture. */
export const SAMPLE_COURSE: Course = {
  id: "course-sample-computer-science", name: "Introduction to machine learning", code: "CS 101", term: "Sample course",
  createdAt: "2026-11-07T00:00:00.000Z", isSample: true,
};
const sampleSource: LectureSource = {
  id: "sample-lecture-notes", kind: "notes", name: "Illustrative sample notes", text: sampleText, addedAt: SAMPLE_COURSE.createdAt,
};
export const SAMPLE_MATERIAL: Material = {
  id: "sample-machine-learning",
  title: "An introduction to machine learning",
  course: SAMPLE_COURSE.name,
  sourceName: "Illustrative sample notes",
  sourceText: sampleText,
  sections: splitIntoSections(sampleText).map(section => ({ ...section, sourceIds: [sampleSource.id] })),
  wordCount: sampleText.split(/\s+/u).length,
  createdAt: "2026-11-07T00:00:00.000Z",
  isSample: true,
  courseId: SAMPLE_COURSE.id,
  lectureNumber: 1,
  sources: [sampleSource],
  compilation: null,
};
