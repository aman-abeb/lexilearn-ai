"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FlowArtwork } from "@/components/flow-artwork";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useAuth } from "@/components/auth-provider";
import { useReadingPreferences } from "@/components/reading-preferences-provider";

export type AccountSetup = {
  googleReady: boolean;
  mongoReady: boolean;
  secretReady: boolean;
  clientIdsDiffer: boolean;
};

export function AuthSignInCard({ setup, nextPath }: { setup: AccountSetup; nextPath: string }) {
  const router = useRouter();
  const { user, ready, error, signInWithGoogle } = useAuth();
  const { preferences } = useReadingPreferences();
  const [signingIn, setSigningIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const onCredential = useCallback(async (idToken: string) => {
    setSigningIn(true);
    setActionError(null);
    try {
      await signInWithGoogle(idToken);
      router.replace(nextPath);
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Google sign-in did not finish. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }, [nextPath, router, signInWithGoogle]);

  const missing = [
    !setup.googleReady ? "your Google web client ID" : null,
    !setup.mongoReady ? "MONGODB_URI" : null,
    !setup.secretReady ? "AUTH_SECRET (at least 32 characters)" : null,
  ].filter((item): item is string => Boolean(item));
  const message = actionError ?? error;

  return <section className="auth-card" aria-labelledby="auth-heading">
    <FlowArtwork className="auth-flow-art" variant="path" />
    <p className="eyebrow">SIGN IN</p>
    <h1 id="auth-heading">{user ? `Welcome back, ${user.name}.` : "Welcome back."}</h1>
    <p className="page-subtitle">Sign in with Google to open your lectures. Reading preferences, your last section, and your glossary stay with this account.</p>
    {message ? <div className="error-panel" role="alert"><p>{message}</p></div> : null}
    {setup.clientIdsDiffer ? <div className="notice" role="status"><p>GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID do not match. Use the same web client ID in both, then restart the server.</p></div> : null}
    {!ready ? <p className="field-help">Checking your account…</p> : null}
    {ready && user ? <Link href={nextPath} className="button button-primary auth-continue">Continue</Link> : null}
    {ready && !user ? <>
      {missing.length > 0 ? <div className="notice" role="status"><p>Add {missing.join(" and ")} in <code>.env</code>, then restart the server. Put the same Google web client ID in <code>GOOGLE_CLIENT_ID</code> and <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>.</p></div> : null}
      {setup.googleReady ? <GoogleSignIn onCredential={(idToken) => void onCredential(idToken)} appearance={preferences.appearance} /> : null}
      {signingIn ? <p className="field-help" role="status">Signing in…</p> : null}
    </> : null}
  </section>;
}
