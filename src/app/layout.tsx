import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { ReadingPreferencesProvider } from "@/components/reading-preferences-provider";
import { ReadingProgressProvider } from "@/components/reading-progress-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LexiLearn AI — Your learning, your way", template: "%s | LexiLearn AI" },
  description: "A calm, customizable reading space for university students, designed with dyslexic learners in mind.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><ReadingPreferencesProvider><ReadingProgressProvider><AppShell>{children}</AppShell></ReadingProgressProvider></ReadingPreferencesProvider></body></html>;
}
