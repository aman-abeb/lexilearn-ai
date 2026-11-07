"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_READING_PREFERENCES, type PreferenceArrangement, type ReadingPreferences } from "@/lib/contracts";
import { MAX_ARRANGEMENTS, safeActiveArrangementId, safeArrangements, safePreferences } from "@/lib/preferences";

const STORAGE_KEY = "lexilearn.reading-preferences.v1";
const ARRANGEMENTS_KEY = "lexilearn.reading-arrangements.v1";

type PreferencesContextValue = {
  preferences: ReadingPreferences;
  arrangements: PreferenceArrangement[];
  activeArrangementId: string | null;
  ready: boolean;
  storageAvailable: boolean;
  updatePreferences: (updates: Partial<ReadingPreferences>) => void;
  replacePreferences: (next: ReadingPreferences) => void;
  replaceArrangements: (next: PreferenceArrangement[], activeId: string | null) => void;
  saveArrangement: (name: string) => string | null;
  applyArrangement: (id: string) => void;
  updateActiveArrangement: () => void;
  deleteArrangement: (id: string) => void;
  resetPreferences: () => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function newArrangementId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `arrangement-${Date.now()}`;
}

export function ReadingPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ReadingPreferences>({ ...DEFAULT_READING_PREFERENCES });
  const [arrangements, setArrangements] = useState<PreferenceArrangement[]>([]);
  const [activeArrangementId, setActiveArrangementId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { setPreferences(safePreferences(JSON.parse(saved))); }
        catch { setPreferences({ ...DEFAULT_READING_PREFERENCES }); }
      }
      const stored = window.localStorage.getItem(ARRANGEMENTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { arrangements?: unknown; activeArrangementId?: unknown };
        const list = safeArrangements(parsed.arrangements);
        setArrangements(list);
        setActiveArrangementId(safeActiveArrangementId(parsed.activeArrangementId, list));
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); }
    catch { setStorageAvailable(false); }
    document.documentElement.dataset.appearance = preferences.appearance;
  }, [preferences, ready]);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(ARRANGEMENTS_KEY, JSON.stringify({ arrangements, activeArrangementId })); }
    catch { setStorageAvailable(false); }
  }, [arrangements, activeArrangementId, ready]);

  const replacePreferences = useCallback((next: ReadingPreferences) => {
    setPreferences(safePreferences(next));
  }, []);

  const replaceArrangements = useCallback((next: PreferenceArrangement[], activeId: string | null) => {
    const saved = safeArrangements(next);
    setArrangements(saved);
    setActiveArrangementId(safeActiveArrangementId(activeId, saved));
  }, []);

  const saveArrangement = useCallback((name: string) => {
    const trimmed = name.trim().slice(0, 40);
    if (!trimmed) return "Give this arrangement a name.";
    const snapshot = safePreferences(preferences);
    const match = arrangements.find(item => item.name.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      setArrangements(current => current.map(item => item.id === match.id ? { ...item, name: trimmed, preferences: snapshot } : item));
      setActiveArrangementId(match.id);
      return null;
    }
    if (arrangements.length >= MAX_ARRANGEMENTS) return "You can save up to 8 arrangements.";
    const id = newArrangementId();
    setArrangements(current => [...current, { id, name: trimmed, preferences: snapshot }]);
    setActiveArrangementId(id);
    return null;
  }, [arrangements, preferences]);

  const applyArrangement = useCallback((id: string) => {
    const match = arrangements.find(item => item.id === id);
    if (!match) return;
    setPreferences(safePreferences(match.preferences));
    setActiveArrangementId(match.id);
  }, [arrangements]);

  const updateActiveArrangement = useCallback(() => {
    if (!activeArrangementId) return;
    const snapshot = safePreferences(preferences);
    setArrangements(current => current.map(item => item.id === activeArrangementId ? { ...item, preferences: snapshot } : item));
  }, [activeArrangementId, preferences]);

  const deleteArrangement = useCallback((id: string) => {
    setArrangements(current => current.filter(item => item.id !== id));
    setActiveArrangementId(current => current === id ? null : current);
  }, []);

  return <PreferencesContext.Provider value={{
    preferences, arrangements, activeArrangementId, ready, storageAvailable,
    updatePreferences: updates => setPreferences(current => safePreferences({ ...current, ...updates })),
    replacePreferences,
    replaceArrangements,
    saveArrangement,
    applyArrangement,
    updateActiveArrangement,
    deleteArrangement,
    resetPreferences: () => {
      setPreferences(current => safePreferences({ ...DEFAULT_READING_PREFERENCES, appearance: current.appearance }));
      setActiveArrangementId(null);
    },
  }}>{children}</PreferencesContext.Provider>;
}

export function useReadingPreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("Reading preferences require ReadingPreferencesProvider.");
  return value;
}
