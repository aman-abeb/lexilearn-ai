"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_READING_PREFERENCES, type ReadingPreferences } from "@/lib/contracts";

const STORAGE_KEY = "lexilearn.reading-preferences.v1";

function safePreferences(value: unknown): ReadingPreferences {
  if (!value || typeof value !== "object") return { ...DEFAULT_READING_PREFERENCES };
  const data = value as Partial<ReadingPreferences>;
  const numeric = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return {
    fontSize: numeric(data.fontSize, 16, 32, DEFAULT_READING_PREFERENCES.fontSize),
    lineHeight: numeric(data.lineHeight, 1.5, 2.5, DEFAULT_READING_PREFERENCES.lineHeight),
    letterSpacing: numeric(data.letterSpacing, 0, 0.12, DEFAULT_READING_PREFERENCES.letterSpacing),
    fontFamily: data.fontFamily === "serif" ? "serif" : "sans",
    theme: data.theme === "white" || data.theme === "night" ? data.theme : "paper",
    focusMode: typeof data.focusMode === "boolean" ? data.focusMode : false,
    sentenceGuide: typeof data.sentenceGuide === "boolean" ? data.sentenceGuide : false,
    speechRate: numeric(data.speechRate, 0.75, 1.25, DEFAULT_READING_PREFERENCES.speechRate),
  };
}

type PreferencesContextValue = {
  preferences: ReadingPreferences;
  ready: boolean;
  storageAvailable: boolean;
  updatePreferences: (updates: Partial<ReadingPreferences>) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ReadingPreferences>({ ...DEFAULT_READING_PREFERENCES });
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { setPreferences(safePreferences(JSON.parse(saved))); }
        catch { setPreferences({ ...DEFAULT_READING_PREFERENCES }); }
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
    catch { setStorageAvailable(false); }
  }, [preferences, ready]);

  return <PreferencesContext.Provider value={{
    preferences, ready, storageAvailable,
    updatePreferences: updates => setPreferences(current => safePreferences({ ...current, ...updates })),
    resetPreferences: () => setPreferences({ ...DEFAULT_READING_PREFERENCES }),
  }}>{children}</PreferencesContext.Provider>;
}

export function useReadingPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("Reading preferences require ReadingPreferencesProvider.");
  return value;
}
