"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { apiRequest } from "@/lib/client/api";
import type { MaterialResponse } from "@/lib/contracts";

export default function NewMaterialPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceName, setSourceName] = useState("Pasted notes");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function importText(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".txt")) { setError("Choose a plain text (.txt) file for this prototype."); event.target.value = ""; return; }
    if (file.size > 200_000) { setError("That file is too large. Choose a text file with up to 50,000 characters."); event.target.value = ""; return; }
    setImporting(true);
    try {
      const text = await file.text();
      if (text.length > 50_000) throw new Error("That file contains more than 50,000 characters. Please shorten it first.");
      if (text.includes("\u0000")) throw new Error("This file does not look like plain text. Please save it as UTF-8 text first.");
      setSourceText(text); setSourceName(file.name);
      if (!title) setTitle(file.name.replace(/\.txt$/i, "").slice(0, 120));
    } catch (error) { setError(error instanceof Error ? error.message : "The file could not be read."); }
    finally { setImporting(false); event.target.value = ""; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (sourceText.trim().length < 30) { setError("Add at least 30 characters of course material."); return; }
    setPending(true);
    try {
      const { material } = await apiRequest<MaterialResponse>("/api/materials", { method: "POST", body: JSON.stringify({ title: title.trim(), course: course.trim(), sourceText, sourceName }) });
      router.push(`/read/${material.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Your material could not be saved."); setPending(false); }
  }

  return <>
    <Link className="back-link" href="/"><Icon name="back" size={17} />Back to library</Link>
    <div className="page-heading"><p className="eyebrow">START WITH YOUR MATERIAL</p><h1>Bring your notes.</h1><p className="page-subtitle">Add a lecture or a reading passage. We’ll give it space to breathe.</p></div>
    <form className="form-panel" onSubmit={submit}>
      <div className="form-grid"><div className="field"><label className="field-label" htmlFor="material-title">Material title</label><input className="text-input" id="material-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Introduction to machine learning" required maxLength={120} disabled={pending} /></div><div className="field"><label className="field-label" htmlFor="material-course">Course</label><input className="text-input" id="material-course" value={course} onChange={event => setCourse(event.target.value)} placeholder="e.g. Computer Science 101" required maxLength={100} disabled={pending} /></div></div>
      <div className="upload-zone"><Icon name="upload" size={26} /><div><strong>Have a text file?</strong><p>Import a .txt file, or paste your notes below.</p></div><input ref={fileInput} type="file" accept=".txt,text/plain" onChange={importText} disabled={pending || importing} className="sr-only" tabIndex={-1} aria-label="Import a plain text file" /><button type="button" className="button button-secondary" disabled={pending || importing} onClick={() => fileInput.current?.click()}>{importing ? "Reading file…" : "Choose .txt file"}</button></div>
      {sourceName !== "Pasted notes" && <p className="file-name" role="status"><Icon name="check" size={16} />Imported: {sourceName}</p>}
      <div className="field"><label className="field-label" htmlFor="material-text">Course material</label><p className="field-help" id="material-text-help">Keep paragraph breaks between ideas. Your original wording will be preserved.</p><textarea className="text-area" id="material-text" value={sourceText} onChange={event => setSourceText(event.target.value)} placeholder="Paste your lecture notes or reading passage here…" required minLength={30} maxLength={50_000} rows={13} aria-describedby="material-text-help material-text-count" disabled={pending || importing} /><p id="material-text-count" className="character-count">{sourceText.length.toLocaleString()} / 50,000 characters</p></div>
      {error && <div className="error-panel" role="alert">{error}</div>}
      <p className="field-help">Use material you have permission to add. This local prototype stores notes on this computer. PDF and recording imports are planned next.</p>
      <div className="form-actions"><Link href="/" className="button button-ghost">Cancel</Link><button type="submit" className="button button-primary" disabled={pending || importing}>{pending ? "Saving your material…" : "Add to my library"}<Icon name="arrow" size={18} /></button></div>
    </form>
  </>;
}
