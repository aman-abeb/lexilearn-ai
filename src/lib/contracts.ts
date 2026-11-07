/** Shared frontend/backend contracts. Coordinate changes across all three owners. */
export type MaterialSection = {
  id: string;
  title: string;
  text: string;
  sourceLabel: string;
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
};

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
export type MaterialResponse = { material: Material };
export type AdaptationResponse = { adaptation: AdaptationResult };
