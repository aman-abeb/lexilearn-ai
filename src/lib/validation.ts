import { z } from "zod";

export const createMaterialSchema = z.object({
  title: z.string().trim().min(1, "Give your material a title.").max(120),
  course: z.string().trim().min(1, "Add a course name.").max(100),
  sourceName: z.string().trim().min(1).max(200).optional(),
  // Preserve the source exactly; whitespace is checked without transforming it.
  sourceText: z.string().min(30).max(50_000).refine(
    (text) => text.trim().length >= 30,
    "Add at least 30 characters of lecture content.",
  ),
}).strict();

export const adaptationSchema = z.object({
  sectionId: z.string().min(1).max(100),
  mode: z.enum(["plain-language", "steps", "terms"]),
}).strict();

export const readingPreferencesSchema = z.object({
  fontSize: z.number().min(16).max(32),
  lineHeight: z.number().min(1.5).max(2.5),
  letterSpacing: z.number().min(0).max(0.12),
  fontFamily: z.enum(["sans", "serif"]),
  theme: z.enum(["paper", "white", "night"]),
  focusMode: z.boolean(),
  sentenceGuide: z.boolean().default(false),
  speechRate: z.number().min(0.75).max(1.25).default(0.9),
}).strict();

export const storedMaterialsSchema = z.array(z.object({
  id: z.string(),
  title: z.string(),
  course: z.string(),
  sourceName: z.string(),
  sourceText: z.string(),
  sections: z.array(z.object({
    id: z.string(), title: z.string(), text: z.string(), sourceLabel: z.string(),
  })),
  createdAt: z.string(),
  wordCount: z.number().int().nonnegative(),
  isSample: z.boolean(),
}));
