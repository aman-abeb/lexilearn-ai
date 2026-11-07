import { DEFAULT_READING_PREFERENCES, type PreferenceArrangement, type ReadingPreferences } from "@/lib/contracts";

export const MAX_ARRANGEMENTS = 8;

function numeric(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function themeOf(value: unknown): ReadingPreferences["theme"] {
  return value === "white" || value === "yellow" || value === "blue" || value === "night" ? value : "paper";
}

/** Keep saved preferences inside the ranges the reader can present. */
export function safePreferences(value: unknown): ReadingPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_READING_PREFERENCES };
  const data = value as Partial<ReadingPreferences>;
  return {
    fontSize: numeric(data.fontSize, 16, 32, DEFAULT_READING_PREFERENCES.fontSize),
    lineHeight: numeric(data.lineHeight, 1.5, 2.5, DEFAULT_READING_PREFERENCES.lineHeight),
    letterSpacing: numeric(data.letterSpacing, 0, 0.12, DEFAULT_READING_PREFERENCES.letterSpacing),
    wordSpacing: numeric(data.wordSpacing, 0, 0.35, DEFAULT_READING_PREFERENCES.wordSpacing),
    paragraphSpacing: numeric(data.paragraphSpacing, 0.4, 2, DEFAULT_READING_PREFERENCES.paragraphSpacing),
    fontFamily: data.fontFamily === "serif" ? "serif" : data.fontFamily === "clear" ? "clear" : "sans",
    fontWeight: data.fontWeight === "bold" ? "bold" : "regular",
    theme: themeOf(data.theme),
    appearance: data.appearance === "dark" ? "dark" : "light",
    focusMode: typeof data.focusMode === "boolean" ? data.focusMode : false,
    sentenceGuide: typeof data.sentenceGuide === "boolean" ? data.sentenceGuide : false,
    readingGuide: typeof data.readingGuide === "boolean" ? data.readingGuide : false,
    speechRate: numeric(data.speechRate, 0.5, 2, DEFAULT_READING_PREFERENCES.speechRate),
  };
}

/** Named snapshots of a full reading setup. Invalid rows are dropped, and the list stops at 8. */
export function safeArrangements(value: unknown): PreferenceArrangement[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const arrangements: PreferenceArrangement[] = [];
  for (const item of value) {
    if (arrangements.length >= MAX_ARRANGEMENTS) break;
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; name?: unknown; preferences?: unknown };
    if (typeof record.id !== "string" || record.id.length < 1 || record.id.length > 80 || seen.has(record.id)) continue;
    if (typeof record.name !== "string") continue;
    const name = record.name.trim().slice(0, 40);
    if (!name) continue;
    seen.add(record.id);
    arrangements.push({ id: record.id, name, preferences: safePreferences(record.preferences) });
  }
  return arrangements;
}

export function safeActiveArrangementId(id: unknown, arrangements: PreferenceArrangement[]): string | null {
  return typeof id === "string" && arrangements.some(item => item.id === id) ? id : null;
}

/** Live settings plus saved arrangements, in a stable shape for storage and sync. */
export function preferenceSyncBody(preferences: unknown, arrangements: unknown, activeArrangementId: unknown) {
  const saved = safeArrangements(arrangements);
  return {
    ...safePreferences(preferences),
    arrangements: saved,
    activeArrangementId: safeActiveArrangementId(activeArrangementId, saved),
  };
}
