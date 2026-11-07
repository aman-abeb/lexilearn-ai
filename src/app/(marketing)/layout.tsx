"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/theme-toggle";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="landing-screen">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <header className="landing-topbar">
      <Link href="/" className="brand" aria-label="LexiLearn home"><span className="brand-mark"><Icon name="book" size={25} /></span><span><span className="brand-name">LexiLearn<span> AI</span></span><span className="brand-sub">A little more clarity.</span></span></Link>
      <div className="topbar-actions">
        <ThemeToggle />
        <Link href="/auth" className="button button-secondary button-small">Sign in</Link>
      </div>
    </header>
    <main id="main-content" className="landing-main" tabIndex={-1}>{children}</main>
  </div>;
}
