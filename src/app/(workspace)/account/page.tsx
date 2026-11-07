"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { GoogleSignIn } from "@/components/google-sign-in";
import { useAuth } from "@/components/auth-provider";
import { useReadingPreferences } from "@/components/reading-preferences-provider";

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, error, syncError, signInWithGoogle, signOut } = useAuth();
  const { preferences } = useReadingPreferences();
  const [signingIn, setSigningIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const onCredential = useCallback(async (idToken: string) => {
    setSigningIn(true);
    setActionError(null);
    try {
      await signInWithGoogle(idToken);
      router.replace("/dashboard");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Google sign-in did not finish. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }, [router, signInWithGoogle]);

  const message = actionError ?? error;
  return <>
    <div className="page-heading">
      <p className="eyebrow">YOUR ACCOUNT</p>
      <h1>{user ? "Signed in with Google" : "Keep your place."}</h1>
      <p className="page-subtitle">Sign in when you want reading preferences, your last section, and your glossary to follow this Google account on the web and in the mobile app.</p>
    </div>
    <section className="form-panel" aria-labelledby="account-heading">
      <h2 id="account-heading">{user ? "This account" : "Google sign-in"}</h2>
      {message ? <div className="error-panel" role="alert"><p>{message}</p></div> : null}
      {syncError ? <div className="notice" role="status"><p>{syncError}</p></div> : null}
      {!ready ? <p className="field-help">Checking your account…</p> : null}
      {ready && user ? <div className="account-identity">
        {user.picture ? <img className="account-avatar" src={user.picture} alt="" width={48} height={48} referrerPolicy="no-referrer" /> : null}
        <div>
          <p><strong>{user.name}</strong></p>
          <p className="field-help">{user.email}</p>
        </div>
      </div> : null}
      {ready && user ? <button type="button" className="button button-secondary" onClick={() => void signOut().catch((reason: unknown) => setActionError(reason instanceof Error ? reason.message : "Sign-out did not finish. Please try again."))}>Sign out</button> : null}
      {ready && !user ? <>
        <GoogleSignIn onCredential={(idToken) => void onCredential(idToken)} appearance={preferences.appearance} />
        {signingIn ? <p className="field-help" role="status">Signing in…</p> : null}
      </> : null}
      <p className="source-note">An account is optional. Without one, settings and progress stay in this browser. Signing out on one device also ends the saved session on your other devices.</p>
    </section>
  </>;
}
