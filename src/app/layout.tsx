import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AccountSync } from "@/components/account-sync";
import { AuthProvider } from "@/components/auth-provider";
import { ReadingPreferencesProvider } from "@/components/reading-preferences-provider";
import { ReadingProgressProvider } from "@/components/reading-progress-provider";
import "./globals.css";

const appearanceScript = `(function(){try{var saved=localStorage.getItem("lexilearn.reading-preferences.v1");var appearance="light";if(saved){var value=JSON.parse(saved).appearance;if(value==="dark")appearance="dark";}document.documentElement.dataset.appearance=appearance;}catch(e){}})();`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: { default: "LexiLearn AI — Your learning, your way", template: "%s | LexiLearn AI" },
  description: "A calm, customizable reading space for university students, designed with dyslexic learners in mind.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" data-appearance="light" suppressHydrationWarning><body suppressHydrationWarning><script dangerouslySetInnerHTML={{ __html: appearanceScript }} /><AuthProvider><ReadingPreferencesProvider><ReadingProgressProvider><AccountSync />{children}</ReadingProgressProvider></ReadingPreferencesProvider></AuthProvider></body></html>;
}
