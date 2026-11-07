"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AccountUser, PreferenceArrangement, ReadingPreferences } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import type { ReadingProgressStore } from "@/lib/client/reading-progress";

export type AccountBundle = {
  preferences: ReadingPreferences;
  arrangements: PreferenceArrangement[];
  activeArrangementId: string | null;
  progress: ReadingProgressStore;
  created: boolean;
};

type SessionResponse = { user: null } | {
  user: AccountUser;
  preferences: ReadingPreferences;
  arrangements?: PreferenceArrangement[];
  activeArrangementId?: string | null;
  progress: ReadingProgressStore;
};

type SignInResponse = {
  user: AccountUser;
  preferences: ReadingPreferences;
  arrangements?: PreferenceArrangement[];
  activeArrangementId?: string | null;
  progress: ReadingProgressStore;
  created: boolean;
  token?: string;
};

type AuthContextValue = {
  user: AccountUser | null;
  bundle: AccountBundle | null;
  ready: boolean;
  error: string | null;
  syncError: string | null;
  signInWithGoogle: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  reportSyncError: (message: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [bundle, setBundle] = useState<AccountBundle | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<SessionResponse>("/api/auth/session")
      .then((data) => {
        if (cancelled) return;
        if (!data.user) {
          setUser(null);
          setBundle(null);
          return;
        }
        setUser(data.user);
        setBundle({
          preferences: data.preferences,
          arrangements: data.arrangements ?? [],
          activeArrangementId: data.activeArrangementId ?? null,
          progress: data.progress,
          created: false,
        });
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not check your account.");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const signInWithGoogle = useCallback(async (idToken: string) => {
    setError(null);
    const data = await apiRequest<SignInResponse>("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ idToken }),
    });
    setUser(data.user);
    setBundle({
      preferences: data.preferences,
      arrangements: data.arrangements ?? [],
      activeArrangementId: data.activeArrangementId ?? null,
      progress: data.progress,
      created: data.created,
    });
    setSyncError(null);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await apiRequest("/api/auth/sign-out", { method: "POST" });
    setUser(null);
    setBundle(null);
    setSyncError(null);
  }, []);

  const reportSyncError = useCallback((message: string | null) => {
    setSyncError(message);
  }, []);

  return <AuthContext.Provider value={{
    user, bundle, ready, error, syncError, signInWithGoogle, signOut, reportSyncError,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Account actions require AuthProvider.");
  return value;
}
