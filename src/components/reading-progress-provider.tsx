"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Material } from "@/lib/contracts";
import { getMaterialProgress, parseProgressStore, type ReadingProgress, type ReadingProgressStore } from "@/lib/client/reading-progress";

const STORAGE_KEY = "lexilearn.reading-progress.v1";
type ProgressContextValue = {
  progress: ReadingProgressStore;
  ready: boolean;
  storageAvailable: boolean;
  updateProgress: (material: Material, update: (current: ReadingProgress) => ReadingProgress) => void;
};
const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ReadingProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ReadingProgressStore>({});
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { setProgress(parseProgressStore(JSON.parse(saved))); }
        catch { setProgress({}); }
      }
    } catch { setStorageAvailable(false); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
    catch { setStorageAvailable(false); }
  }, [progress, ready]);

  const updateProgress = useCallback((material: Material, update: (current: ReadingProgress) => ReadingProgress) => {
    if (!ready) return;
    setProgress(current => ({
      ...current,
      [material.id]: getMaterialProgress(material, update(getMaterialProgress(material, current[material.id]))),
    }));
  }, [ready]);

  return <ProgressContext.Provider value={{ progress, ready, storageAvailable, updateProgress }}>{children}</ProgressContext.Provider>;
}

export function useReadingProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("Reading progress requires ReadingProgressProvider.");
  return value;
}
