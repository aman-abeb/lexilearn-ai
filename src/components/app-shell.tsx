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
  const isExam = pathname.startsWith("/exam-preparation");
  const isReader = pathname.startsWith("/read/");
  const isLectures = !isPreferences && !isCourses && !isAccount && !isExam;
  const label = isReader ? "Your reading space" : isExam ? "Practice at your own pace" : isCourses ? "Your subjects, organized" : isPreferences ? "Comfort is personal" : isAccount ? "Your account" : "Your learning, your way";
  return <div className={`app-shell ${isReader && preferences.focusMode ? "shell-focus" : ""}`}>
    <a href="#main-content" className="skip-link">Skip to main content</a>
    <aside className="sidebar">
      <Link href="/dashboard" className="brand" aria-label="LexiLearn dashboard"><span className="brand-mark"><Icon name="book" size={25} /></span><span><span className="brand-name">LexiLearn<span> AI</span></span><span className="brand-sub">A little more clarity.</span></span></Link>
      <nav aria-label="Main navigation">
        <Link href="/dashboard" className={`nav-link ${isLectures ? "active" : ""}`} aria-current={pathname === "/dashboard" ? "page" : undefined} aria-label="My lectures"><Icon name="book" /><span className="nav-label"><span className="nav-full">My lectures</span><span className="nav-short">Lectures</span></span></Link>
        <Link href="/courses" className={`nav-link ${isCourses ? "active" : ""}`} aria-current={isCourses ? "page" : undefined} aria-label="My courses"><Icon name="courses" /><span className="nav-label"><span className="nav-full">My courses</span><span className="nav-short">Courses</span></span></Link>
        <Link href="/exam-preparation" className={`nav-link ${isExam ? "active" : ""}`} aria-current={isExam ? "page" : undefined} aria-label="Exam preparation"><Icon name="check" /><span className="nav-label"><span className="nav-full">Exam preparation</span><span className="nav-short">Exam</span></span></Link>
        <Link href="/preferences" className={`nav-link ${isPreferences ? "active" : ""}`} aria-current={isPreferences ? "page" : undefined} aria-label="Reading preferences"><Icon name="sliders" /><span className="nav-label"><span className="nav-full">Reading preferences</span><span className="nav-short">Reading</span></span></Link>
        <Link href={user ? "/account" : "/auth"} className={`nav-link ${isAccount ? "active" : ""}`} aria-current={isAccount ? "page" : undefined} aria-label={user ? "Account" : "Sign in"}><Icon name="user" /><span className="nav-label"><span className="nav-full">{user ? "Account" : "Sign in"}</span><span className="nav-short">{user ? "Account" : "Sign in"}</span></span></Link>
      </nav>
      <div className="sidebar-note"><span className="section-kicker">MADE FOR YOUR PACE</span><p>Less reading friction.<br />More room to understand.</p><small>Designed with dyslexic learners in mind. Always yours to adjust.</small></div>
      <div className="sidebar-footer"><span className="status-dot" />{user ? "Signed in" : "Your personal learning space"}</div>
    </aside>
    <div className="workspace"><header className="topbar"><span className="topbar-label">{label}</span><div className="topbar-actions"><ThemeToggle /><span className="topbar-status"><span className="status-dot" />{user && !syncError ? "Saved to your account" : "Saved in this browser"}</span>{user ? <Link href="/account" className="topbar-user">{user.name}</Link> : <Link href="/auth" className="button button-secondary button-small">Sign in</Link>}</div></header><main id="main-content" className="main-content" tabIndex={-1}>{children}</main></div>
  </div>;
}
