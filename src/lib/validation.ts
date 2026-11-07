import { z } from "zod";
import { parseYouTubeUrl } from "./youtube";

export const MAX_SOURCE_CHARACTERS = 100_000;
export const MAX_LECTURE_CHARACTERS = 160_000;
export const MAX_SOURCES = 12;

export const youtubeImportSchema = z.object({
  url: z.string().trim().max(2000).refine(value => !!parseYouTubeUrl(value), "Paste a valid YouTube video link, such as https://www.youtube.com/watch?v=… or https://youtu.be/…."),
}).strict();

const youtubeTranscriptSchema = z.object({
  platform: z.literal("youtube"), videoId: z.string().regex(/^[a-zA-Z0-9_-]{11}$/),
  language: z.string().min(2).max(35), languageName: z.string().min(1).max(100), automatic: z.boolean(),
  retrievedAt: z.iso.datetime(), edited: z.boolean().optional(),
}).strict();

export const createCourseSchema = z.object({
  name: z.string().trim().min(1, "Add a course name.").max(100),
  code: z.string().trim().max(24).default(""),
  term: z.string().trim().max(60).default(""),
}).strict();

export const sourceInputSchema = z.object({
  kind: z.enum(["notes", "slides", "recording", "transcript"]),
  name: z.string().trim().min(1, "Give this source a name.").max(200),
  text: z.string().max(MAX_SOURCE_CHARACTERS, "A source can contain up to 100,000 characters.").default(""),
  warnings: z.array(z.string().max(1000)).max(20).optional(),
  transcript: youtubeTranscriptSchema.optional(),
  url: z.url().max(2000).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  }, "Use an https recording link without a username or password.").optional(),
}).strict().superRefine((value, context) => {
  if (value.kind === "recording" && !value.url) context.addIssue({ code: "custom", path: ["url"], message: "Add the recording link." });
  if (value.kind !== "recording" && value.text.trim().length < 10) context.addIssue({ code: "custom", path: ["text"], message: "Add at least 10 characters of source text." });
  if (value.transcript && (value.kind !== "recording" || !value.text.trim() || parseYouTubeUrl(value.url ?? "")?.videoId !== value.transcript.videoId)) {
    context.addIssue({ code: "custom", path: ["transcript"], message: "These captions belong to a different video. Import captions for the current link again." });
  }
});

export const sourceListSchema = z.array(sourceInputSchema).min(1, "Add at least one lecture source.").max(MAX_SOURCES, "A lecture can have up to 12 sources.").refine(
  sources => sources.reduce((sum, source) => sum + source.text.length, 0) <= MAX_LECTURE_CHARACTERS,
  "Keep the combined lecture sources under 160,000 characters.",
);

export const createLectureSchema = z.object({
  title: z.string().trim().min(1, "Give this lecture a title.").max(120),
  courseId: z.string().min(1, "Choose a course.").max(100),
  sources: sourceListSchema,
}).strict();

export const addSourcesSchema = z.object({ sources: sourceListSchema }).strict();

const citationIdsSchema = z.array(z.string().min(1).max(100)).min(1).max(MAX_SOURCES);
export const compilationOutputSchema = z.object({
  overview: z.string().trim().min(1).max(3000),
  sections: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    text: z.string().trim().min(1).max(12_000),
    sourceIds: citationIdsSchema,
  }).strict()).min(1).max(60),
  keyTerms: z.array(z.object({ term: z.string().min(1).max(100), meaning: z.string().min(1).max(800), sourceIds: citationIdsSchema }).strict()).max(30),
  warnings: z.array(z.string().min(1).max(1000)).max(30),
}).strict();

const sectionSchema = z.object({
  id: z.string(), title: z.string(), text: z.string(), sourceLabel: z.string(), sourceIds: z.array(z.string()).optional(),
});
export const compiledNotesSchema = z.object({
  overview: z.string(), sections: z.array(sectionSchema).min(1),
  keyTerms: z.array(z.object({ term: z.string(), meaning: z.string(), sourceIds: z.array(z.string()) })),
  warnings: z.array(z.string()), sourceIds: z.array(z.string()), sourceVersions: z.record(z.string(), z.string()).optional(), generatedAt: z.string(), model: z.string(),
});

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

export const adaptationOutputSchema = z.object({
  text: z.string().trim().min(1).max(8_000),
  sourceSectionIds: z.array(z.string().min(1).max(100)).min(1).max(4),
  warnings: z.array(z.string().trim().min(1).max(500)).max(8),
}).strict();

export const emptyBodySchema = z.object({}).strict();

export const lectureSummaryOutputSchema = z.object({
  headline: z.string().trim().min(1).max(220),
  takeaways: z.array(z.string().trim().min(1).max(400)).min(3).max(8),
  inOneMinute: z.string().trim().min(1).max(1_200),
  warnings: z.array(z.string().trim().min(1).max(500)).max(8),
}).strict();

export const lectureAnalysisOutputSchema = z.object({
  mainIdeas: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    explanation: z.string().trim().min(1).max(800),
  }).strict()).min(2).max(8),
  confusionPoints: z.array(z.object({
    point: z.string().trim().min(1).max(160),
    why: z.string().trim().min(1).max(500),
  }).strict()).max(6),
  connections: z.array(z.string().trim().min(1).max(400)).max(6),
  reviewPlan: z.array(z.string().trim().min(1).max(400)).min(2).max(6),
  warnings: z.array(z.string().trim().min(1).max(500)).max(8),
}).strict();

export const studyChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(2_000),
}).strict();

export const studyChatSchema = z.object({
  messages: z.array(studyChatMessageSchema).min(1).max(12),
}).strict().superRefine((value, context) => {
  if (value.messages.at(-1)?.role !== "user") {
    context.addIssue({ code: "custom", path: ["messages"], message: "Send a question to continue this conversation." });
  }
});

export const studyChatOutputSchema = z.object({
  text: z.string().trim().min(1).max(4_000),
  warnings: z.array(z.string().trim().min(1).max(500)).max(8),
}).strict();

export const practiceStartSchema = z.object({
  sectionId: z.string().trim().min(1).max(100).optional(),
}).strict();

export const practiceHintSchema = z.object({
  problemId: z.string().uuid(),
}).strict();

export const practiceCheckSchema = z.object({
  problemId: z.string().uuid(),
  answer: z.string().trim().min(1, "Write an attempt before checking it.").max(2_000),
}).strict();

export const practiceProblemOutputSchema = z.object({
  prompt: z.string().trim().min(1).max(900),
  concept: z.string().trim().min(1).max(80),
  sectionId: z.string().trim().min(1).max(100),
  hints: z.array(z.string().trim().min(1).max(400)).min(2).max(2),
  expected: z.string().trim().min(1).max(1_200),
  steps: z.array(z.string().trim().min(1).max(500)).min(2).max(5),
  warnings: z.array(z.string().trim().min(1).max(500)).max(6),
}).strict();

export const practiceCheckOutputSchema = z.object({
  verdict: z.enum(["on-track", "partly", "revisit"]),
  feedback: z.string().trim().min(1).max(1_200),
  warnings: z.array(z.string().trim().min(1).max(500)).max(6),
}).strict();

export const readingPreferencesSchema = z.object({
  fontSize: z.number().min(16).max(32),
  lineHeight: z.number().min(1.5).max(2.5),
  letterSpacing: z.number().min(0).max(0.12),
  wordSpacing: z.number().min(0).max(0.35).default(0),
  paragraphSpacing: z.number().min(0.4).max(2).default(1),
  fontFamily: z.enum(["sans", "serif", "clear"]),
  fontWeight: z.enum(["regular", "bold"]).default("regular"),
  theme: z.enum(["paper", "white", "yellow", "blue", "night"]),
  appearance: z.enum(["light", "dark"]).default("light"),
  focusMode: z.boolean(),
  sentenceGuide: z.boolean().default(false),
  readingGuide: z.boolean().default(false),
  readingWidth: z.enum(["narrow", "medium", "wide"]).default("medium"),
  speechRate: z.number().min(0.75).max(1.25).default(0.9),
}).strict();

const arrangementSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(40),
  preferences: readingPreferencesSchema,
});

export const preferenceSetupSchema = readingPreferencesSchema.extend({
  arrangements: z.array(arrangementSchema).max(8).default([]),
  activeArrangementId: z.string().trim().min(1).max(80).nullable().default(null),
}).strict();

export const googleSignInSchema = z.object({
  idToken: z.string().min(20).max(8192),
}).strict();

export const jsonObjectSchema = z.record(z.string(), z.unknown());

export const storedMaterialsSchema = z.array(z.object({
  id: z.string(),
  title: z.string(),
  course: z.string(),
  sourceName: z.string(),
  sourceText: z.string(),
  sections: z.array(sectionSchema),
  createdAt: z.string(),
  wordCount: z.number().int().nonnegative(),
  isSample: z.boolean(),
  courseId: z.string().optional(),
  lectureNumber: z.number().int().positive().optional(),
  sources: z.array(z.object({
    id: z.string(), kind: z.enum(["notes", "slides", "recording", "transcript"]),
    name: z.string(), text: z.string(), url: z.string().optional(), warnings: z.array(z.string()).optional(), transcript: youtubeTranscriptSchema.optional(), addedAt: z.string(), updatedAt: z.string().optional(),
  })).min(1).optional(),
  compilation: compiledNotesSchema.nullable().optional(),
}));

export const storedWorkspaceSchema = z.object({
  version: z.literal(2),
  courses: z.array(z.object({ id: z.string(), name: z.string(), code: z.string(), term: z.string(), createdAt: z.string(), isSample: z.boolean() })),
  materials: storedMaterialsSchema,
});
