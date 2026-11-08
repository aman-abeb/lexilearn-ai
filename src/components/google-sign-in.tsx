"use client";

import { useEffect, useRef } from "react";

type GoogleCredential = { credential?: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredential) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string | number | boolean>) => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignIn({
  onCredential,
  appearance,
}: {
  onCredential: (idToken: string) => void;
  appearance: "light" | "dark";
}) {
  const host = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    const element = host.current;
    if (!element || !CLIENT_ID) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !element.isConnected || !window.google?.accounts.id) return;
      element.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (response) => {
          if (response.credential) onCredentialRef.current(response.credential);
        },
      });
      const width = Math.min(360, Math.max(240, Math.floor(element.getBoundingClientRect().width || 320)));
      window.google.accounts.id.renderButton(element, {
        type: "standard",
        theme: appearance === "dark" ? "filled_black" : "outline",
        size: "large",
        text: "continue_with",
        shape: "rectangular",
        width,
        logo_alignment: "left",
      });
    };

    const existing = document.querySelector<HTMLScriptElement>("script[data-lexilearn-gsi]");
    if (window.google?.accounts.id) render();
    else if (existing) existing.addEventListener("load", render, { once: true });
    else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.dataset.lexilearnGsi = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      element.replaceChildren();
    };
  }, [appearance]);

  if (!CLIENT_ID) {
    return <p className="field-help">Add your Google web client ID as NEXT_PUBLIC_GOOGLE_CLIENT_ID in .env, set GOOGLE_CLIENT_ID to the same value, then restart the server. You can keep reading without an account, and settings stay in this browser.</p>;
  }

  return <div ref={host} className="google-sign-in" />;
}
