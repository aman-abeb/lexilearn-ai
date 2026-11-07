"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPreferences = pathname === "/preferences";
  const isCourses = pathname.startsWith("/courses");
  const isReader = pathname.startsWith("/read/");
  const { preferences } = useReadingPreferences();
  return <div className={`app-shell ${isReader && preferences.focusMode ? "shell-focus" : ""}`}>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="LexiLearn home"><span className="brand-mark"><Icon name="book" size={25} /></span><span><span className="brand-name">LexiLearn<span> AI</span></span><span className="brand-sub">A little more clarity.</span></span></Link>
      <nav aria-label="Main navigation"><Link href="/" className={`nav-link ${!isPreferences && !isCourses ? "active" : ""}`} aria-current={pathname === "/" ? "page" : undefined}><Icon name="book" />My lectures</Link><Link href="/courses" className={`nav-link ${isCourses ? "active" : ""}`} aria-current={isCourses ? "page" : undefined}><Icon name="courses" />My courses</Link><Link href="/preferences" className={`nav-link ${isPreferences ? "active" : ""}`} aria-current={isPreferences ? "page" : undefined}><Icon name="sliders" />Reading settings</Link></nav>
      <div className="sidebar-note"><span className="section-kicker">MADE FOR YOUR PACE</span><p>Less reading friction.<br />More room to understand.</p><small>Designed with dyslexic learners in mind. Always yours to adjust.</small></div>
      <div className="sidebar-footer"><span className="status-dot" />Your personal learning space</div>
    </aside>
    <div className="workspace"><header className="topbar"><span className="topbar-label">{isReader ? "Your reading space" : isCourses ? "Your subjects, organized" : isPreferences ? "Comfort is personal" : "Your learning, your way"}</span><Link href="/preferences" className="topbar-settings"><Icon name="sliders" size={16} />Reading settings</Link></header><main id="main-content" className="main-content" tabIndex={-1}>{children}</main></div>
  </div>;
}
