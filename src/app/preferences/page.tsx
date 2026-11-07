"use client";

import { PreferenceControls, readingStyle } from "@/components/preference-controls";
import { useReadingPreferences } from "@/components/reading-preferences-provider";

export default function PreferencesPage() {
  const { preferences } = useReadingPreferences();
  return <>
    <div className="page-heading"><p className="eyebrow">MAKE YOURSELF COMFORTABLE</p><h1>A reading space that fits you.</h1><p className="page-subtitle">Try a little more space, a different typeface, or a softer background. There is no single right setting.</p></div>
    <div className="preferences-grid"><section aria-labelledby="settings-heading"><h2 id="settings-heading">Your reading preferences</h2><PreferenceControls /></section><section className="preference-preview" aria-labelledby="preview-heading"><div className="section-heading"><h2 id="preview-heading">Try it here</h2><span className="badge badge-muted">Live preview</span></div><article className={`reader-paper theme-${preferences.theme}`} style={readingStyle(preferences)}><p className="reader-source-label">A LITTLE SPACE TO THINK</p><div className="reading-sample"><h3>Understanding takes its own time.</h3><p>You do not need to read everything at once. Start with one idea, pause when you need to, and return to the original material whenever it helps.</p><p>The words stay the same. You choose how they appear.</p></div></article><p className="source-note">These preferences change presentation, not academic content. No diagnosis or personal health information is needed.</p></section></div>
  </>;
}
