"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Material, MaterialSection } from "@/lib/contracts";
import { getMaterialProgress, toggleSection } from "@/lib/client/reading-progress";
import { splitSentences } from "@/lib/client/sentences";
import { readingMaterial } from "@/lib/lecture";
import { Icon } from "./icon";
import { PersonalGlossary } from "./personal-glossary";
import { readingStyle } from "./preference-controls";
import { ReadAloud } from "./read-aloud";
import { useReadingPreferences } from "./reading-preferences-provider";
import { useReadingProgress } from "./reading-progress-provider";

export function StudyReader({ material: original, onOpenSource }: { material: Material; onOpenSource: (id: string) => void }) {
  const material = useMemo(() => readingMaterial(original), [original]);
  const [view, setView] = useState<"section" | "full">("section");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const paper = useRef<HTMLElement>(null);
  const { preferences, updatePreferences, ready } = useReadingPreferences();
  const { progress, updateProgress, ready: progressReady, storageAvailable } = useReadingProgress();
  const saved = getMaterialProgress(material, progress[material.id]);
  const sectionIndex = Math.max(0, material.sections.findIndex(section => section.id === saved.lastSectionId));
  const section = material.sections[sectionIndex];
  const sentences = useMemo(() => splitSentences(section.text), [section.text]);
  const activeSentence = Math.min(sentenceIndex, Math.max(0, sentences.length - 1));
  const guided = view === "section" && preferences.sentenceGuide;
  const text = guided ? sentences[activeSentence] ?? section.text : view === "full" ? material.sections.map(section => `${section.title}\n\n${section.text}`).join("\n\n") : section.text;

  useEffect(() => {
    if (progressReady && !saved.lastSectionId) updateProgress(material, current => ({ ...current, lastSectionId: material.sections[0].id }));
  }, [material, progressReady, saved.lastSectionId, updateProgress]);

  function moveSection(index: number) {
    const target = material.sections[index];
    if (!target) return;
    setView("section"); setSentenceIndex(0);
    updateProgress(material, current => ({ ...current, lastSectionId: target.id }));
    requestAnimationFrame(() => paper.current?.focus());
  }

  function sourceLinks(item: MaterialSection) {
    return <div className="section-citations"><span>{original.compilation ? "Based on" : "Original source"}</span>{item.sourceIds?.map(id => <button type="button" key={id} onClick={() => onOpenSource(id)}>{original.sources.find(source => source.id === id)?.name ?? "View source"}<Icon name="external" size={13} /></button>)}</div>;
  }

  if (!ready || !progressReady) return <div className="loading-state" role="status">Restoring your reading settings…</div>;

  return <div className="reader-main">
    <div className="reader-toolbar"><div className="view-switch" role="group" aria-label="Reading view"><button type="button" aria-pressed={view === "section"} onClick={() => { setView("section"); setSentenceIndex(0); }}>One section</button><button type="button" aria-pressed={view === "full"} onClick={() => setView("full")}>Full notes</button></div>{view === "section" && <button type="button" className="button button-ghost button-small" aria-pressed={preferences.sentenceGuide} onClick={() => { setSentenceIndex(0); updatePreferences({ sentenceGuide: !preferences.sentenceGuide }); }}><Icon name="focus" size={17} />Sentence guide {preferences.sentenceGuide ? "on" : "off"}</button>}</div>
    {view === "section" && <div className="section-picker"><label className="field-label" htmlFor="section-picker">Section {sectionIndex + 1} of {material.sections.length}</label><select className="text-input" id="section-picker" value={sectionIndex} onChange={event => moveSection(Number(event.target.value))}>{material.sections.map((item, index) => <option key={item.id} value={index}>{index + 1}. {item.title}{saved.completedSectionIds.includes(item.id) ? " · Read" : ""}{saved.reviewSectionIds.includes(item.id) ? " · Revisit" : ""}</option>)}</select></div>}
    <article ref={paper} tabIndex={-1} className={`reader-paper theme-${preferences.theme}${preferences.readingGuide ? " reading-guide" : ""}`} style={readingStyle(preferences)} aria-label={view === "full" ? "Full lecture notes" : `Section ${sectionIndex + 1}`}>
      <div className="paper-content"><p className="reader-source-label">{original.compilation ? "Compiled study notes" : "Original source text"}{guided ? ` · Sentence ${activeSentence + 1} of ${sentences.length}` : ""}</p>
        {view === "full" ? material.sections.map(item => <section className="full-note-section" key={item.id}><h2>{item.title}</h2><p className="reader-text">{item.text}</p>{sourceLinks(item)}</section>) : <><h2>{section.title}</h2><p className="reader-text" aria-live={guided ? "polite" : "off"} aria-atomic="true">{text}</p>{sourceLinks(section)}</>}
      </div>
    </article>
    {guided && <nav className="sentence-navigation" aria-label="Sentences in this section"><button type="button" className="button button-secondary button-small" disabled={activeSentence === 0} onClick={() => setSentenceIndex(activeSentence - 1)}>Previous sentence</button><span role="status">{activeSentence + 1} / {sentences.length}</span><button type="button" className="button button-secondary button-small" disabled={activeSentence >= sentences.length - 1} onClick={() => setSentenceIndex(activeSentence + 1)}>Next sentence</button></nav>}
    {view === "section" && <>
      <div className="reading-actions"><label className="checkbox-control"><input type="checkbox" checked={saved.completedSectionIds.includes(section.id)} onChange={() => updateProgress(material, current => ({ ...current, completedSectionIds: toggleSection(current.completedSectionIds, section.id) }))} /><span>Mark section as read</span></label><button type="button" className="button button-ghost button-small" aria-pressed={saved.reviewSectionIds.includes(section.id)} onClick={() => updateProgress(material, current => ({ ...current, reviewSectionIds: toggleSection(current.reviewSectionIds, section.id) }))}>{saved.reviewSectionIds.includes(section.id) ? "Saved to revisit" : "Revisit later"}</button></div>
      <nav className="section-navigation" aria-label="Lecture sections"><button type="button" className="button button-secondary" disabled={sectionIndex === 0} onClick={() => moveSection(sectionIndex - 1)}><Icon name="back" size={17} />Previous section</button><button type="button" className="button button-primary" disabled={sectionIndex >= material.sections.length - 1} onClick={() => moveSection(sectionIndex + 1)}>Next section<Icon name="arrow" size={17} /></button></nav>
    </>}
    <ReadAloud key={`${section.id}-${view}-${guided}-${activeSentence}`} text={text} label={guided ? "Read sentence aloud" : view === "full" ? "Read full notes aloud" : "Read section aloud"} />
    <div className="reader-progress"><span role="status">{saved.completedSectionIds.length} of {material.sections.length} sections marked as read</span><div className="progress-track" role="progressbar" aria-label="Sections marked as read" aria-valuenow={saved.completedSectionIds.length} aria-valuemin={0} aria-valuemax={material.sections.length}><span style={{ width: `${saved.completedSectionIds.length / material.sections.length * 100}%` }} /></div></div>
    {original.compilation && <details className="study-panel"><summary>Lecture overview</summary><div className={`study-panel-content overview-content theme-${preferences.theme}`} style={readingStyle(preferences)}><p className="reading-sample">{original.compilation.overview}</p></div></details>}
    {original.compilation?.keyTerms.length ? <details className="study-panel"><summary>Key terms from this lecture <span className="badge badge-muted">{original.compilation.keyTerms.length}</span></summary><div className="study-panel-content"><dl className="lecture-terms">{original.compilation.keyTerms.map((term, index) => <div className={`theme-${preferences.theme}`} style={readingStyle(preferences)} key={index}><dt className="reading-sample">{term.term}</dt><dd><p className="reading-sample">{term.meaning}</p><div className="section-citations">{term.sourceIds.map(id => <button type="button" key={id} onClick={() => onOpenSource(id)}>View source<Icon name="external" size={13} /></button>)}</div></dd></div>)}</dl></div></details> : null}
    <details className="study-panel"><summary>Sections to revisit <span className="badge badge-muted">{saved.reviewSectionIds.length}</span></summary><div className="study-panel-content">{!saved.reviewSectionIds.length ? <p className="field-help">Save a section with “Revisit later” whenever you want another look.</p> : <ul className="review-list">{material.sections.filter(item => saved.reviewSectionIds.includes(item.id)).map(item => <li key={item.id}><button type="button" className="button button-secondary button-small" onClick={() => moveSection(material.sections.indexOf(item))}>{item.title}<Icon name="arrow" size={16} /></button><span className="field-help">{item.text.slice(0, 100)}{item.text.length > 100 ? "…" : ""}</span></li>)}</ul>}</div></details>
    {view === "section" && <PersonalGlossary key={section.id} material={material} section={section} entries={saved.glossary} onOpenSource={onOpenSource} onOpenSection={id => moveSection(material.sections.findIndex(item => item.id === id))} />}
    <p className="source-note" role="status">{storageAvailable ? "Your reading place and personal notes are saved in this browser. There’s no rush." : "Browser storage is unavailable. Your reading place and personal notes will last until reload."}</p>
  </div>;
}
