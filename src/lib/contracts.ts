/** Shared frontend/backend contracts. Coordinate changes across all three owners. */
export type MaterialSection = {
  id: string;
  title: string;
  text: string;
  sourceLabel: string;
  sourceIds?: string[];
};

export type Course = {
  id: string;
  name: string;
  code: string;
  term: string;
  createdAt: string;
  isSample: boolean;
};

export type CourseSummary = Course & { lectureCount: number; nextLectureNumber: number };
export type CreateCourseInput = { name: string; code?: string; term?: string };
export type SourceKind = "notes" | "slides" | "recording" | "transcript";
export type YouTubeTranscriptMetadata = {
  platform: "youtube";
  videoId: string;
  language: string;
  languageName: string;
  automatic: boolean;
  retrievedAt: string;
  edited?: boolean;
};
export type CaptionLanguage = { code: string; name: string; automatic: boolean };
export type LectureSourceInput = { kind: SourceKind; name: string; text: string; url?: string; warnings?: string[]; transcript?: YouTubeTranscriptMetadata };
export type LectureSource = LectureSourceInput & { id: string; addedAt: string; updatedAt?: string };

export type CompiledNotes = {
  overview: string;
  sections: MaterialSection[];
  keyTerms: { term: string; meaning: string; sourceIds: string[] }[];
  warnings: string[];
  sourceIds: string[];
  sourceVersions?: Record<string, string>;
  generatedAt: string;
  model: string;
};

export type Material = {
  id: string;
  title: string;
  course: string;
  sourceName: string;
  sourceText: string;
  sections: MaterialSection[];
  createdAt: string;
  wordCount: number;
  isSample: boolean;
  courseId: string;
  lectureNumber: number;
  sources: LectureSource[];
  compilation: CompiledNotes | null;
};

export type CreateLectureInput = { title: string; courseId: string; sources: LectureSourceInput[] };

export type CreateMaterialInput = {
  title: string;
  course: string;
  sourceName?: string;
  sourceText: string;
};

export type ReadingPreferences = {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  fontFamily: "sans" | "serif";
  theme: "paper" | "white" | "night";
  focusMode: boolean;
  sentenceGuide: boolean;
  speechRate: number;
};

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  fontSize: 20,
  lineHeight: 1.9,
  letterSpacing: 0.02,
  fontFamily: "sans",
  theme: "paper",
  focusMode: false,
  sentenceGuide: false,
  speechRate: 0.9,
};

export type AdaptationMode = "plain-language" | "steps" | "terms";

export type AdaptationInput = {
  sectionId: string;
  mode: AdaptationMode;
};

export type AdaptationResult = {
  text: string;
  sourceSectionIds: string[];
  warnings: string[];
  generatedAt: string;
};

export type ApiError = {
  error: { code: string; message: string };
};

export type MaterialListResponse = { materials: Material[] };
export type MaterialResponse = { material: Material; compilationAvailable?: boolean };
export type AdaptationResponse = { adaptation: AdaptationResult };
export type CourseListResponse = { courses: CourseSummary[]; compilationAvailable: boolean };
export type CourseResponse = { course: CourseSummary };
export type ExtractedSourceResponse = { name: string; text: string; warnings: string[] };
export type YouTubeImportResponse = { source: LectureSourceInput; captionsVtt: string; cueCount: number };
