"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { useReadingProgress } from "@/components/reading-progress-provider";
import type { Material, MaterialListResponse } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { getMaterialProgress } from "@/lib/client/reading-progress";

export default function LibraryPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { progress } = useReadingProgress();
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiRequest<MaterialListResponse>("/api/materials", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setMaterials(data.materials); })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "We could not load your library."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <>
    <div className="page-heading"><p className="eyebrow">YOUR STUDY SPACE</p><div className="heading-row"><div><h1>Make room for understanding.</h1><p className="page-subtitle">University reading support, designed with dyslexic students in mind.</p></div><Link className="button button-primary" href="/materials/new"><Icon name="plus" />Add material</Link></div></div>
    <section className="hero-panel" aria-labelledby="hero-title"><div className="hero-copy"><span className="hero-tag"><Icon name="check" size={15} />Built around the way you read</span><h2 id="hero-title">One section.<br />At your own pace.</h2><p>Try one sentence at a time, listen at your own pace, and collect unfamiliar terms. Your place is saved for when you come back.</p><Link href="/preferences" className="button button-secondary">Find your reading settings<Icon name="arrow" size={18} /></Link></div><div className="hero-decoration" aria-hidden="true"><div className="hero-book"><span className="hero-book-line" /><span className="hero-book-line" /><span className="hero-book-line" /><span className="hero-book-line" /><span className="hero-book-line" /></div></div></section>
    <section aria-labelledby="library-title"><div className="section-heading"><div><p className="section-kicker">A PLACE TO BEGIN</p><h2 id="library-title">Your library</h2></div>{!loading && !error && <span className="badge badge-muted">{materials.length} {materials.length === 1 ? "material" : "materials"}</span>}</div>
      {loading ? <div className="loading-state" role="status">Opening your library…</div> : error ? <div className="error-panel" role="alert"><h3>Your library could not load</h3><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : materials.length === 0 ? <div className="empty-state"><Icon name="book" size={32} /><h3>A fresh page</h3><p>Add some course notes to start reading in your own way.</p><Link href="/materials/new" className="button button-primary">Add your first material</Link></div> : <div className="library-grid">{materials.map(material => {
        const saved = getMaterialProgress(material, progress[material.id]);
        const lastSection = material.sections.find(section => section.id === saved.lastSectionId);
        return <article className="material-card" key={material.id}>
          <div className="material-card-top"><span className="material-icon"><Icon name="book" size={24} /></span><span className="badge">{material.isSample ? "Sample lecture" : "Your material"}</span></div>
          <p className="material-meta">{material.course}</p>
          <h3 className="material-title"><Link href={`/read/${material.id}`}>{material.title}</Link></h3>
          <p className="material-description">{material.sections[0]?.text.slice(0, 140) ?? "Open this material in your reading space."}{(material.sections[0]?.text.length ?? 0) > 140 ? "…" : ""}</p>
          {lastSection && <div className="material-progress"><p>{saved.completedSectionIds.length} of {material.sections.length} sections marked as read · {saved.reviewSectionIds.length} to revisit</p><p>Continue from {lastSection.title}</p></div>}
          <div className="material-footer"><span>{material.sections.length} sections · {material.wordCount.toLocaleString()} words</span><Link className="material-open" href={`/read/${material.id}`} aria-label={`${lastSection ? "Continue" : "Read"} ${material.title}`}>{lastSection ? "Continue" : "Read"}<Icon name="arrow" size={18} /></Link></div>
        </article>;
      })}</div>}
    </section>
    <p className="info-note"><Icon name="sliders" size={18} />No single setting works for everyone. You can change yours whenever you need.</p>
  </>;
}
