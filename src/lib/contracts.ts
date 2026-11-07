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
  /** Extra space between words, in em. */
  wordSpacing: number;
  /** Space after each paragraph, in em. */
  paragraphSpacing: number;
  fontFamily: "sans" | "serif" | "clear";
  /** Stronger letter strokes. A presentation choice, not a treatment. */
  fontWeight: "regular" | "bold";
  theme: "paper" | "white" | "yellow" | "blue" | "night";
  /** Light or dark chrome for the whole app. Page colour stays a separate choice. */
  appearance: "light" | "dark";
  focusMode: boolean;
  sentenceGuide: boolean;
  /** Dim other paragraphs while one is pointed at or focused. */
  readingGuide: boolean;
  speechRate: number;
};

export type PreferenceArrangement = {
  id: string;
  name: string;
  preferences: ReadingPreferences;
};

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  fontSize: 20,
  lineHeight: 1.9,
  letterSpacing: 0.02,
  wordSpacing: 0,
  paragraphSpacing: 1,
  fontFamily: "sans",
  fontWeight: "regular",
  theme: "paper",
  appearance: "light",
  focusMode: false,
  sentenceGuide: false,
  readingGuide: false,
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

export type AccountUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
};

export type ApiError = {
  error: { code: string; message: string };
};

export type MaterialListResponse = { materials: Material[] };
export type MaterialResponse = { material: Material; compilationAvailable?: boolean };
export type AdaptationResponse = { adaptation: AdaptationResult };
export type MultipleChoiceQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sectionId: string;
  evidence: string;
};
export type MultipleChoiceResponse = { questions: MultipleChoiceQuestion[]; origin: "sample" | "ai" };
export type CourseListResponse = { courses: CourseSummary[]; compilationAvailable: boolean };
export type CourseResponse = { course: CourseSummary };
export type ExtractedSourceResponse = { name: string; text: string; warnings: string[] };
export type YouTubeImportResponse = { source: LectureSourceInput; captionsVtt: string; cueCount: number };
