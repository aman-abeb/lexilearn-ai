"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "./auth-provider";
import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";
import { ThemeToggle } from "./theme-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, syncError } = useAuth();
  const { preferences } = useReadingPreferences();
  const isPreferences = pathname.startsWith("/preferences");
  const isCourses = pathname.startsWith("/courses");
  const isAccount = pathname.startsWith("/account");
  const isReader = pathname.startsWith("/read/");
  const isLectures = !isPreferences && !isCourses && !isAccount;
  const label = isReader ? "Your reading space" : isCourses ? "Your subjects, organized" : isPreferences ? "Comfort is personal" : isAccount ? "Your account" : "Your learning, your way";
  return <div className={`app-shell ${isReader && preferences.focusMode ? "shell-focus" : ""}`}>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" aria-label="LexiLearn dashboard"><span className="brand-mark"><Icon name="book" size={25} /></span><span><span className="brand-name">LexiLearn<span> AI</span></span><span className="brand-sub">A little more clarity.</span></span></Link>
      <nav aria-label="Main navigation">
        <Link href="/dashboard" className={`nav-link ${isLectures ? "active" : ""}`} aria-current={pathname === "/dashboard" ? "page" : undefined}><Icon name="book" />My lectures</Link>
        <Link href="/courses" className={`nav-link ${isCourses ? "active" : ""}`} aria-current={isCourses ? "page" : undefined}><Icon name="courses" />My courses</Link>
        <Link href="/preferences" className={`nav-link ${isPreferences ? "active" : ""}`} aria-current={isPreferences ? "page" : undefined}><Icon name="sliders" />Reading preferences</Link>
        <Link href={user ? "/account" : "/auth"} className={`nav-link ${isAccount ? "active" : ""}`} aria-current={isAccount ? "page" : undefined}><Icon name="user" />{user ? "Account" : "Sign in"}</Link>
      </nav>
      <div className="sidebar-note"><span className="section-kicker">MADE FOR YOUR PACE</span><p>Less reading friction.<br />More room to understand.</p><small>Designed with dyslexic learners in mind. Always yours to adjust.</small></div>
      <div className="sidebar-footer"><span className="status-dot" />{user ? "Signed in" : "Your personal learning space"}</div>
    </aside>
    <div className="workspace"><header className="topbar"><span className="topbar-label">{label}</span><div className="topbar-actions"><ThemeToggle /><span className="topbar-status"><span className="status-dot" />{user && !syncError ? "Saved to your account" : "Saved in this browser"}</span>{user ? <Link href="/account" className="topbar-user">{user.name}</Link> : <Link href="/auth" className="button button-secondary button-small">Sign in</Link>}</div></header><main id="main-content" className="main-content" tabIndex={-1}>{children}</main></div>
  </div>;
}
