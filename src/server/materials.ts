import { randomUUID } from "node:crypto";
import type { CreateMaterialInput, Material, MaterialSection } from "../lib/contracts";

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
  return {
    id: randomUUID(),
    title: input.title,
    course: input.course,
    sourceName: input.sourceName ?? "Pasted lecture notes",
    sourceText: input.sourceText,
    sections: splitIntoSections(input.sourceText),
    wordCount: input.sourceText.trim().split(/\s+/u).filter(Boolean).length,
    createdAt: new Date().toISOString(),
    isSample: false,
  };
}

const sampleText = `Machine learning is a way of finding patterns in examples. Instead of writing every rule by hand, we use data to train a model. A model is a mathematical system that uses these patterns to make a prediction about a new example.

In supervised learning, each training example includes an input and a known answer called a label. For example, an email can be paired with the label "spam" or "not spam". The model learns from these labelled examples. Classification means predicting a category, while regression means predicting a numerical value.

Training data is used to fit the model. Test data is kept separate and used to evaluate how well the model works on examples it did not train on. If the model memorizes the training examples but performs poorly on new ones, this is called overfitting.

Accuracy is the fraction of predictions that are correct. It can be misleading when categories are very uneven. If 950 of 1,000 emails are not spam, a model that always predicts "not spam" achieves 95% accuracy, even though it finds none of the spam. We need to choose evaluation measures that match the problem.`;

/** Illustrative fixture written for this starter, not an actual university lecture. */
export const SAMPLE_MATERIAL: Material = {
  id: "sample-machine-learning",
  title: "An introduction to machine learning",
  course: "Computer science · Sample",
  sourceName: "Illustrative sample notes",
  sourceText: sampleText,
  sections: splitIntoSections(sampleText),
  wordCount: sampleText.split(/\s+/u).length,
  createdAt: "2026-11-07T00:00:00.000Z",
  isSample: true,
};
