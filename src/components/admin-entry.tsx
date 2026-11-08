"use client";

import { useCallback, useState, type FormEvent } from "react";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AppShell } from "@/components/app-shell";
import { AuthScreen } from "@/components/auth-screen";
import { FlowArtwork } from "@/components/flow-artwork";
import { useAuth } from "@/components/auth-provider";

export function AdminEntry({ loginReady }: { loginReady: boolean }) {
  const { user, ready, error, signInAsAdmin } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigningIn(true);
    setActionError(null);
    try {
      await signInAsAdmin(email, password);
      setPassword("");
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Admin sign-in did not finish. Please try again.");
    } finally {
      setSigningIn(false);
    }
  }, [email, password, signInAsAdmin]);

  if (ready && user) {
    return <AppShell><AdminDashboard /></AppShell>;
  }

  const message = actionError ?? error;
  return <AuthScreen>
    <section className="auth-card" aria-labelledby="admin-auth-heading">
      <FlowArtwork className="auth-flow-art" variant="path" />
      <p className="eyebrow">ADMIN</p>
      <h1 id="admin-auth-heading">Admin sign-in</h1>
      <p className="page-subtitle">Sign in with the admin email and password to manage people and the library.</p>
      {message ? <div className="error-panel" role="alert"><p>{message}</p></div> : null}
      {!ready ? <p className="field-help">Checking your account…</p> : null}
      {ready && !loginReady ? <div className="notice" role="status"><p>Add <code>ADMIN_EMAIL</code> and <code>ADMIN_PASSWORD</code> (at least 12 characters) in <code>.env</code>, then restart the server.</p></div> : null}
      {ready && loginReady ? <form className="admin-login" onSubmit={(event) => void onSubmit(event)}>
        <div className="field">
          <label className="field-label" htmlFor="admin-email">Email</label>
          <input id="admin-email" className="text-input" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="admin-password">Password</label>
          <input id="admin-password" className="text-input" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <button type="submit" className="button button-primary" disabled={signingIn}>Sign in</button>
      </form> : null}
      {signingIn ? <p className="field-help" role="status">Signing in…</p> : null}
    </section>
  </AuthScreen>;
}
