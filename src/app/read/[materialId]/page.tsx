"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { PersonalGlossary } from "@/components/personal-glossary";
import { PreferenceControls, readingStyle } from "@/components/preference-controls";
import { ReadAloud } from "@/components/read-aloud";
import { useReadingPreferences } from "@/components/reading-preferences-provider";
import { useReadingProgress } from "@/components/reading-progress-provider";
import { apiRequest } from "@/lib/client/api";
import { getMaterialProgress, toggleSection } from "@/lib/client/reading-progress";
import { splitSentences } from "@/lib/client/sentences";
import type { Material, MaterialResponse } from "@/lib/contracts";

export default function ReaderPage() {
  const { materialId } = useParams<{ materialId: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setMaterial(null); setError("");
    apiRequest<MaterialResponse>(`/api/materials/${encodeURIComponent(materialId)}`, { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setMaterial(data.material); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "We could not open this material."); });
    return () => controller.abort();
  }, [materialId, attempt]);

  if (error) return <><Link href="/" className="back-link"><Icon name="back" size={17} />Back to library</Link><div className="error-panel" role="alert"><h1>This material could not open</h1><p>{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div></>;
  if (!material || material.id !== materialId) return <div className="loading-state" role="status">Opening your reading space…</div>;
  return <ReadingWorkspace key={material.id} material={material} />;
}

function ReadingWorkspace({ material }: { material: Material }) {
  const [view, setView] = useState<"sections" | "original">("sections");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const paper = useRef<HTMLElement>(null);
  const { preferences, updatePreferences, ready } = useReadingPreferences();
  const { progress, updateProgress, ready: progressReady, storageAvailable } = useReadingProgress();
  const saved = getMaterialProgress(material, progress[material.id]);
  const sectionIndex = Math.max(0, material.sections.findIndex(section => section.id === saved.lastSectionId));
  const section = material.sections[sectionIndex];
  const sentences = useMemo(() => splitSentences(section.text), [section.text]);
  const guided = view === "sections" && preferences.sentenceGuide;
  const text = view === "original" ? material.sourceText : guided ? sentences[sentenceIndex] ?? sentences[0] : section.text;
  const completed = saved.completedSectionIds.includes(section.id);
  const review = saved.reviewSectionIds.includes(section.id);

  useEffect(() => {
    if (progressReady && !saved.lastSectionId) {
      updateProgress(material, current => ({ ...current, lastSectionId: material.sections[0].id }));
    }
  }, [material, progressReady, saved.lastSectionId, updateProgress]);

  function moveSection(index: number) {
    const target = material.sections[index];
    if (!target) return;
    setView("sections"); setSentenceIndex(0);
    updateProgress(material, current => ({ ...current, lastSectionId: target.id }));
    requestAnimationFrame(() => paper.current?.focus());
  }

  if (!ready || !progressReady) return <div className="loading-state" role="status">Restoring your reading space…</div>;

  return <div className={preferences.focusMode ? "focus-mode" : ""}>
    <Link href="/" className="back-link"><Icon name="back" size={17} />Back to library</Link>
    <div className="page-heading"><p className="eyebrow">{material.course}</p><h1>{material.title}</h1><p className="page-subtitle">{material.sections.length} sections · {material.wordCount.toLocaleString()} words{material.isSample ? " · Sample lecture" : ""}</p></div>
    <div className="reader-toolbar"><div className="view-switch" role="group" aria-label="Reading view"><button type="button" aria-pressed={view === "sections"} onClick={() => { setView("sections"); setSentenceIndex(0); }}>One section at a time</button><button type="button" aria-pressed={view === "original"} onClick={() => setView("original")}>Original text</button></div><button className="button button-secondary button-small" type="button" aria-pressed={preferences.focusMode} onClick={() => updatePreferences({ focusMode: !preferences.focusMode })}><Icon name="focus" size={17} />{preferences.focusMode ? "Show settings" : "Focus view"}</button></div>
    <div className="reader-layout"><div className="reader-main">
      <div className="reader-progress"><span role="status">{saved.completedSectionIds.length} of {material.sections.length} sections marked as read</span><div className="progress-track" role="progressbar" aria-label="Sections marked as read" aria-valuenow={saved.completedSectionIds.length} aria-valuemin={0} aria-valuemax={material.sections.length}><span style={{ width: `${(saved.completedSectionIds.length / material.sections.length) * 100}%` }} /></div></div>
      {view === "sections" && <div className="reader-toolbar">
        <div className="section-picker"><label htmlFor="section-picker">Jump to section</label>
          <select id="section-picker" className="text-input" value={sectionIndex} onChange={event => moveSection(Number(event.target.value))}>{material.sections.map((item, index) => <option key={item.id} value={index}>{item.title}{saved.completedSectionIds.includes(item.id) ? " · Read" : ""}{saved.reviewSectionIds.includes(item.id) ? " · Revisit" : ""}</option>)}</select>
        </div>
        <button type="button" className="button button-secondary button-small" aria-pressed={preferences.sentenceGuide} onClick={() => { setSentenceIndex(0); updatePreferences({ sentenceGuide: !preferences.sentenceGuide }); }}>Sentence guide {preferences.sentenceGuide ? "on" : "off"}</button>
      </div>}
      <article ref={paper} tabIndex={-1} aria-label={view === "original" ? "Original source text" : `Section ${sectionIndex + 1}`} className={`reader-paper theme-${preferences.theme} ${preferences.focusMode ? "is-focused" : ""}`} style={readingStyle(preferences)}>
        <p className="reader-source-label">{view === "original" ? material.sourceName : section?.sourceLabel}</p>
        {guided && <p className="guide-label">Sentence {sentenceIndex + 1} of {sentences.length} · Original wording</p>}
        <div className="reader-text">{view === "sections" && <h2>{section.title}</h2>}<p aria-live={guided ? "polite" : "off"} aria-atomic="true">{text}</p></div>
      </article>
      {guided && <nav className="sentence-navigation" aria-label="Sentences in this section"><button type="button" className="button button-secondary button-small" disabled={sentenceIndex === 0} onClick={() => setSentenceIndex(index => index - 1)}>Previous sentence</button><span role="status">{sentenceIndex + 1} / {sentences.length}</span><button type="button" className="button button-secondary button-small" disabled={sentenceIndex >= sentences.length - 1} onClick={() => setSentenceIndex(index => index + 1)}>Next sentence</button></nav>}
      {view === "sections" && <div className="reading-actions">
        <label className="checkbox-control"><input type="checkbox" checked={completed} onChange={() => updateProgress(material, current => ({ ...current, completedSectionIds: toggleSection(current.completedSectionIds, section.id) }))} /><span>Mark section as read</span></label>
        <button type="button" className="button button-secondary button-small" aria-pressed={review} onClick={() => updateProgress(material, current => ({ ...current, reviewSectionIds: toggleSection(current.reviewSectionIds, section.id) }))}>{review ? "Saved to revisit" : "Revisit later"}</button>
      </div>}
      {view === "sections" && <nav className="section-navigation" aria-label="Reading sections"><button className="button button-secondary" disabled={sectionIndex === 0} onClick={() => moveSection(sectionIndex - 1)}><Icon name="back" size={17} />Previous</button><button className="button button-primary" disabled={sectionIndex >= material.sections.length - 1} onClick={() => moveSection(sectionIndex + 1)}>Next section<Icon name="arrow" size={17} /></button></nav>}
      <ReadAloud key={`${section.id}-${view}-${guided}-${sentenceIndex}`} text={text} label={guided ? "Read sentence aloud" : view === "original" ? "Read original aloud" : "Read section aloud"} />
      <p className="source-note" role="status">{storageAvailable ? "Your place, read sections, revisit list, and glossary are saved in this browser. Return from the library to continue." : "Browser storage is unavailable. Your progress and glossary will last until this page is reloaded."}</p>
      <details className="study-panel"><summary>Sections to revisit <span className="badge badge-muted">{saved.reviewSectionIds.length}</span></summary><div className="study-panel-content">{saved.reviewSectionIds.length === 0 ? <p className="field-help">Use “Revisit later” on a section you want to return to.</p> : <ul className="review-list">{material.sections.filter(item => saved.reviewSectionIds.includes(item.id)).map(item => <li key={item.id}><button type="button" className="button button-secondary button-small" onClick={() => moveSection(material.sections.indexOf(item))}>{item.title}<Icon name="arrow" size={16} /></button><span className="field-help">{item.text.slice(0, 100)}{item.text.length > 100 ? "…" : ""}</span></li>)}</ul>}</div></details>
      {view === "sections" && <PersonalGlossary key={section.id} material={material} section={section} entries={saved.glossary} onOpenSection={sectionId => moveSection(material.sections.findIndex(item => item.id === sectionId))} />}
      <p className="source-note">Your source wording is unchanged. Sections follow the original paragraphs; the optional sentence guide shows smaller pieces. AI explanations and simplification are planned for the next stage.</p>
    </div><aside className="reader-settings" aria-labelledby="reader-settings-title"><div className="section-heading"><h2 id="reader-settings-title">Make it yours</h2><Icon name="sliders" size={20} /></div><PreferenceControls compact /></aside></div>
  </div>;
}
