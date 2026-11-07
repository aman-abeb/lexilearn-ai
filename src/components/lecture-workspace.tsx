"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { LectureSource, Material, MaterialResponse } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { compilationIsCurrent, readingMaterial } from "@/lib/lecture";
import { Icon } from "./icon";
import { PreferenceControls } from "./preference-controls";
import { useReadingPreferences } from "./reading-preferences-provider";
import { useReadingProgress } from "./reading-progress-provider";
import { SourceComposer } from "./source-composer";
import { SourceList } from "./source-list";
import { PracticeSession } from "./practice-session";
import { StudyCompanion } from "./study-companion";
import { StudyReader } from "./study-reader";

export function LectureWorkspace({ initialMaterial, compilationAvailable }: { initialMaterial: Material; compilationAvailable: boolean }) {
  const id = useId();
  const [material, setMaterial] = useState(initialMaterial);
  const [tab, setTab] = useState<"notes" | "practice" | "ask" | "sources">(initialMaterial.sections.length || initialMaterial.compilation ? "notes" : "sources");
  const [practiceSectionId, setPracticeSectionId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [editingSource, setEditingSource] = useState<LectureSource | null>(null);
  const [selectedSource, setSelectedSource] = useState("");
  const [compiling, setCompiling] = useState(false);
  const [error, setError] = useState("");
  const [sourceMessage, setSourceMessage] = useState("");
  const composerHeading = useRef<HTMLHeadingElement>(null);
  const { preferences, updatePreferences, ready } = useReadingPreferences();
  const { updateProgress } = useReadingProgress();
  const readable = material.sources.filter(source => source.text.trim());
  const current = compilationIsCurrent(material);

  async function compile() {
    setCompiling(true); setError("");
    try {
      const { material: updated } = await apiRequest<MaterialResponse>(`/api/materials/${material.id}/compile`, { method: "POST", body: "{}" });
      const previousReader = readingMaterial(material);
      updateProgress(previousReader, current => ({ ...current, glossary: current.glossary.map(entry => {
        const section = previousReader.sections.find(section => section.id === entry.sectionId);
        return section ? { ...entry, sourceIds: section.sourceIds, sectionTitle: section.title } : entry;
      }) }));
      setMaterial(updated); setTab("notes");
    } catch (error) { setError(error instanceof Error ? error.message : "Your study notes could not be compiled. Please try again."); }
    finally { setCompiling(false); }
  }

  function openSource(sourceId: string) {
    setSelectedSource(sourceId); setTab("sources");
    requestAnimationFrame(() => {
      const target = document.getElementById(`source-${sourceId}`);
      target?.setAttribute("tabindex", "-1"); target?.focus();
    });
  }

  function openPracticeSection(sectionId: string, markRevisit: boolean) {
    const reader = readingMaterial(material);
    if (!reader.sections.some(section => section.id === sectionId)) return;
    updateProgress(reader, current => ({
      ...current,
      lastSectionId: sectionId,
      reviewSectionIds: markRevisit && !current.reviewSectionIds.includes(sectionId) ? [...current.reviewSectionIds, sectionId] : current.reviewSectionIds,
    }));
    setTab("notes");
  }

  function openComposer(source?: LectureSource) {
    setEditingSource(source ?? null); setAddingSource(true); setTab("sources");
    requestAnimationFrame(() => composerHeading.current?.focus());
  }

  function downloadNotes() {
    const reader = readingMaterial(material);
    const terms = material.compilation?.keyTerms.map(term => `${term.term}: ${term.meaning}`).join("\n\n");
    const text = `${material.course}\nLecture ${material.lectureNumber}: ${material.title}\n${material.compilation ? "AI-compiled study notes\n\n" + material.compilation.overview : "Original source text"}\n\n${reader.sections.map(section => `${section.title}\n\n${section.text}\n\nSources: ${section.sourceLabel}`).join("\n\n---\n\n")}${terms ? "\n\nKey terms\n\n" + terms : ""}\n\n${material.compilation?.warnings.length ? "Source notes:\n" + material.compilation.warnings.join("\n") : ""}`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `lecture-${material.lectureNumber}-notes.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className={`lecture-workspace ${preferences.focusMode ? "focus-mode" : ""}`}>
    <Link href={`/courses/${material.courseId}`} className="back-link"><Icon name="back" size={17} />Back to course</Link>
    <header className="page-heading lecture-heading"><div className="lecture-context"><Link href={`/courses/${material.courseId}`}>{material.course}</Link><span className="badge badge-muted">Lecture {String(material.lectureNumber).padStart(2, "0")}</span>{material.isSample && <span className="badge badge-muted">Illustrative sample</span>}{material.compilation && <span className="badge"><Icon name="check" size={14} />AI-compiled notes</span>}</div><h1>{material.title}</h1></header>
    <div className="workspace-navigation"><div className="workspace-tabs" role="group" aria-label="Lecture workspace"><button type="button" aria-pressed={tab === "notes"} onClick={() => setTab("notes")}><Icon name="book" size={18} />Study notes</button><button type="button" aria-pressed={tab === "practice"} onClick={() => setTab("practice")}><Icon name="practice" size={18} />Practice</button><button type="button" aria-pressed={tab === "ask"} onClick={() => setTab("ask")}><Icon name="chat" size={18} />Ask AI</button><button type="button" aria-pressed={tab === "sources"} onClick={() => setTab("sources")}><Icon name="file" size={18} />Sources <span className="tab-count">{material.sources.length}</span></button></div><button type="button" className="button button-ghost button-small" disabled={!ready} aria-pressed={preferences.focusMode} onClick={() => updatePreferences({ focusMode: !preferences.focusMode })}><Icon name="focus" size={18} />{preferences.focusMode ? "Exit focus" : "Focus view"}</button></div>
    <div className="workspace-tools"><button type="button" className="button button-ghost button-small" aria-expanded={settingsOpen} aria-controls={`${id}-settings`} onClick={() => setSettingsOpen(value => !value)}><Icon name="sliders" size={18} />{settingsOpen ? "Close reading settings" : "Reading settings"}</button>{tab === "notes" && readable.length > 0 && <button type="button" className="button button-ghost button-small" onClick={downloadNotes}><Icon name="download" size={18} />Save a text copy</button>}</div>
    <section id={`${id}-settings`} className="reading-settings-drawer" hidden={!settingsOpen} aria-label="Reading settings"><PreferenceControls compact /></section>
    {readable.length > 0 && <div hidden={tab !== "practice"}><PracticeSession key={`${material.id}-${material.compilation?.generatedAt ?? "source"}`} material={material} aiAvailable={compilationAvailable} focusSectionId={practiceSectionId} onOpenSection={openPracticeSection} /></div>}
    {tab === "practice" ? (readable.length ? null : <div className="empty-state"><span className="empty-icon"><Icon name="practice" size={28} /></span><h2>Nothing to practice yet</h2><p>Add notes, slides, or a transcript first. Then you can try a problem from this lecture.</p><button type="button" className="button button-primary" onClick={() => openComposer()}>Add lecture content<Icon name="plus" size={18} /></button></div>) : tab === "ask" ? (readable.length ? <StudyCompanion key={`${material.id}-${material.compilation?.generatedAt ?? "source"}`} material={material} aiAvailable={compilationAvailable} /> : <div className="empty-state"><span className="empty-icon"><Icon name="chat" size={28} /></span><h2>Nothing to ask about yet</h2><p>Add notes, slides, or a transcript first. Then you can summarise, analyse, or talk through the lecture.</p><button type="button" className="button button-primary" onClick={() => openComposer()}>Add lecture content<Icon name="plus" size={18} /></button></div>) : tab === "notes" ? <>
      {(!material.compilation || !current) && <section className="compilation-panel" aria-labelledby="compilation-heading" aria-busy={compiling}><span className="compilation-icon"><Icon name="sparkles" size={23} /></span><div><h2 id="compilation-heading">{material.compilation ? "Your sources have changed" : "One lecture. One set of notes."}</h2><p>{material.compilation ? "Compile again to bring the updated material into your study notes." : "Bring the lecture notes, slide text, and transcript into a single, organized reading."}</p>{!compilationAvailable ? <p className="field-help">AI compilation is not connected yet. You can read the original source text below.</p> : !readable.length ? <p className="field-help">Add notes, slides, or a recording transcript to start.</p> : <p className="field-help">{readable.length} {readable.length === 1 ? "source has" : "sources have"} text ready to use. Links without transcripts stay available in Sources.</p>}</div><button type="button" className="button button-primary" disabled={compiling || !readable.length || !compilationAvailable} onClick={() => void compile()}>{compiling ? "Compiling notes…" : material.compilation ? "Update study notes" : "Compile study notes"}<Icon name="arrow" size={18} /></button></section>}
      {compiling && <p className="notice" role="status">Bringing your lecture sources together. You can keep reading while your notes are prepared.</p>}
      {error && <p className="error-panel" role="alert">{error}</p>}
      {readingMaterial(material).sections.length > 0 ? <StudyReader key={`${material.id}-${material.compilation?.generatedAt ?? "source"}`} material={material} aiAvailable={compilationAvailable} onOpenSource={openSource} onPractice={sectionId => { setPracticeSectionId(sectionId); setTab("practice"); }} /> : <div className="empty-state"><span className="empty-icon"><Icon name="recording" size={28} /></span><h2>Your recording is saved</h2><p>Add its transcript, lecture notes, or slides to start building your reading space.</p><button type="button" className="button button-primary" onClick={() => openComposer(material.sources.find(source => source.kind === "recording"))}>Add lecture content<Icon name="plus" size={18} /></button></div>}
      {material.compilation?.warnings.length ? <details className="study-panel"><summary>Source notes to check <span className="badge badge-muted">{material.compilation.warnings.length}</span></summary><div className="study-panel-content"><ul className="source-warning-list">{material.compilation.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div></details> : null}
      {material.compilation && current && <details className="study-panel"><summary>Update compiled notes</summary><div className="study-panel-content"><p className="field-help">Compile a fresh version from the current sources. Reading markers restart for the new sections; your personal glossary stays linked to the originals.</p><button type="button" className="button button-secondary" disabled={compiling || !compilationAvailable} onClick={() => void compile()}><Icon name="sparkles" size={18} />{compiling ? "Compiling notes…" : "Compile again"}</button></div></details>}
    </> : <section aria-labelledby="sources-heading">
      <div className="section-heading"><div><h2 id="sources-heading">Your lecture sources</h2><p className="page-subtitle">The originals are always here for you to check.</p></div><button type="button" className="button button-secondary" disabled={addingSource || compiling || material.sources.length >= 12} onClick={() => openComposer()}><Icon name="plus" size={18} />Add source</button></div>
      {addingSource && <section className="source-editor" aria-labelledby="source-editor-heading"><h3 id="source-editor-heading" ref={composerHeading} tabIndex={-1}>{editingSource ? `Update ${editingSource.name}` : "Add a lecture source"}</h3><SourceComposer key={editingSource?.id ?? "new"} initialSource={editingSource ?? undefined} disabled={compiling} onCancel={() => { setAddingSource(false); setEditingSource(null); }} onAdd={async source => {
        const { material: updated } = await apiRequest<MaterialResponse>(`/api/materials/${material.id}/sources${editingSource ? `/${editingSource.id}` : ""}`, { method: editingSource ? "PATCH" : "POST", body: JSON.stringify(editingSource ? source : { sources: [source] }) });
        setMaterial(updated); setAddingSource(false); setEditingSource(null); setSourceMessage(`${source.name} saved. ${updated.compilation ? "Update your study notes to include the change." : "You can now read the source text or compile study notes."}`);
      }} /></section>}
      {sourceMessage && <p className="notice" role="status"><Icon name="check" size={18} />{sourceMessage}</p>}
      <SourceList sources={material.sources} showText selectedId={selectedSource} onEdit={compiling || addingSource ? undefined : sourceId => openComposer(material.sources.find(source => source.id === sourceId))} />
      <div className="sources-footer"><p className="field-help">YouTube links can import available captions. Other recording links need a supplied transcript to include their spoken content.</p><button type="button" className="button button-secondary" onClick={() => setTab("notes")}>Go to study notes<Icon name="arrow" size={18} /></button></div>
    </section>}
  </div>;
}
