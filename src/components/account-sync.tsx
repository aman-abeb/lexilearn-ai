"use client";

import { useEffect, useRef } from "react";
import { apiRequest } from "@/lib/client/api";
import { parseProgressStore } from "@/lib/client/reading-progress";
import { preferenceSyncBody } from "@/lib/preferences";
import { useAuth } from "./auth-provider";
import { useReadingPreferences } from "./reading-preferences-provider";
import { useReadingProgress } from "./reading-progress-provider";

const SYNC_ERROR = "Changes are kept in this browser, but they could not be saved to your account.";

export function AccountSync() {
  const { user, bundle, ready, reportSyncError } = useAuth();
  const { preferences, arrangements, activeArrangementId, ready: preferencesReady, replacePreferences, replaceArrangements } = useReadingPreferences();
  const { progress, ready: progressReady, replaceProgress } = useReadingProgress();
  const appliedId = useRef<string | null>(null);
  const pause = useRef(false);
  const lastSavedPreferences = useRef<string | null>(null);
  const lastSavedProgress = useRef<string | null>(null);
  const preferencesRequest = useRef(0);
  const progressRequest = useRef(0);

  useEffect(() => {
    if (!ready || !preferencesReady || !progressReady) return;
    if (!user || !bundle) {
      appliedId.current = null;
      pause.current = false;
      lastSavedPreferences.current = null;
      lastSavedProgress.current = null;
      return;
    }
    const key = bundle.created ? `${user.id}:new` : user.id;
    if (appliedId.current === key) return;
    appliedId.current = key;
    if (bundle.created) {
      pause.current = false;
      lastSavedPreferences.current = null;
      lastSavedProgress.current = null;
      return;
    }
    pause.current = true;
    lastSavedPreferences.current = JSON.stringify(preferenceSyncBody(bundle.preferences, bundle.arrangements, bundle.activeArrangementId));
    lastSavedProgress.current = JSON.stringify(parseProgressStore(bundle.progress));
    replacePreferences(bundle.preferences);
    replaceArrangements(bundle.arrangements, bundle.activeArrangementId);
    replaceProgress(bundle.progress);
  }, [ready, preferencesReady, progressReady, user, bundle, replacePreferences, replaceArrangements, replaceProgress]);

  useEffect(() => {
    if (!pause.current) return;
    const preferencesMatch = JSON.stringify(preferenceSyncBody(preferences, arrangements, activeArrangementId)) === lastSavedPreferences.current;
    const progressMatch = JSON.stringify(progress) === lastSavedProgress.current;
    if (preferencesMatch && progressMatch) pause.current = false;
  }, [preferences, arrangements, activeArrangementId, progress]);

  useEffect(() => {
    if (!ready || !preferencesReady || !user || pause.current || !appliedId.current) return;
    const serial = JSON.stringify(preferenceSyncBody(preferences, arrangements, activeArrangementId));
    if (lastSavedPreferences.current === serial) return;
    const requestId = ++preferencesRequest.current;
    const handle = window.setTimeout(() => {
      apiRequest("/api/account/preferences", { method: "PUT", body: serial })
        .then(() => {
          if (preferencesRequest.current !== requestId) return;
          lastSavedPreferences.current = serial;
          reportSyncError(null);
        })
        .catch(() => {
          if (preferencesRequest.current === requestId) reportSyncError(SYNC_ERROR);
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [preferences, arrangements, activeArrangementId, ready, preferencesReady, user, reportSyncError]);

  useEffect(() => {
    if (!ready || !progressReady || !user || pause.current || !appliedId.current) return;
    const serial = JSON.stringify(progress);
    if (lastSavedProgress.current === serial) return;
    const requestId = ++progressRequest.current;
    const handle = window.setTimeout(() => {
      apiRequest("/api/account/progress", { method: "PUT", body: JSON.stringify(progress) })
        .then(() => {
          if (progressRequest.current !== requestId) return;
          lastSavedProgress.current = serial;
          reportSyncError(null);
        })
        .catch(() => {
          if (progressRequest.current === requestId) reportSyncError(SYNC_ERROR);
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [progress, ready, progressReady, user, reportSyncError]);

  return null;
}
