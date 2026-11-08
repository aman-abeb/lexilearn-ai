"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-provider";

export function RequireSignIn({ children }: { children: ReactNode }) {
  const { user, ready, error } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user && !error) {
      router.replace(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, error, pathname, router]);

  if (!ready) return <p className="field-help">Checking your account…</p>;
  if (!user) {
    return <div className="error-panel" role="alert"><p>{error ?? "Sign in to open your lectures."}</p></div>;
  }
  return children;
}
