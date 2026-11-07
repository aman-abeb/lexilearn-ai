"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPreferences = pathname === "/preferences";
  return <div className="app-shell">
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="LexiLearn home"><span className="brand-mark"><Icon name="book" size={25} /></span><span><span className="brand-name">LexiLearn<span> AI</span></span><span className="brand-sub">A little more clarity.</span></span></Link>
      <nav aria-label="Main navigation"><Link href="/" className={`nav-link ${!isPreferences ? "active" : ""}`} aria-current={!isPreferences ? "page" : undefined}><Icon name="book" />My library</Link><Link href="/preferences" className={`nav-link ${isPreferences ? "active" : ""}`} aria-current={isPreferences ? "page" : undefined}><Icon name="sliders" />Reading preferences</Link></nav>
      <div className="sidebar-note"><span className="section-kicker">MADE FOR YOUR PACE</span><p>Less reading friction.<br />More room to understand.</p><small>Designed with dyslexic learners in mind. Always yours to adjust.</small></div>
      <div className="sidebar-footer"><span className="status-dot" />Your personal learning space</div>
    </aside>
    <div className="workspace"><header className="topbar"><span className="topbar-label">Your learning, your way</span><span className="topbar-status">Local prototype</span></header><main id="main-content" className="main-content" tabIndex={-1}>{children}</main></div>
  </div>;
}
