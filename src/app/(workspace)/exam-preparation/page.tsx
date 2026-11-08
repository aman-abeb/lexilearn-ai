"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { ExamVoice } from "@/components/exam-voice";
import { Icon } from "@/components/icon";
import { readingStyle } from "@/components/preference-controls";
import { ReadAloud } from "@/components/read-aloud";
import { useReadingPreferences } from "@/components/reading-preferences-provider";
import { apiRequest } from "@/lib/client/api";
import type { ExtractedSourceResponse, Material, MaterialListResponse, MaterialSection, MultipleChoiceResponse } from "@/lib/contracts";
import { readingMaterial } from "@/lib/lecture";

type Mode = "written" | "oral" | "mcq";

export default function ExamPreparationPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [materialId, setMaterialId] = useState("");
  const [mode, setMode] = useState<Mode>("written");
  const [aiAvailable, setAiAvailable] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiRequest<MaterialListResponse>("/api/materials", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setMaterials(data.materials); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We could not load your lectures."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    const controller = new AbortController();
    apiRequest<{ aiConfigured?: boolean }>("/api/health", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted && data.aiConfigured === false) setAiAvailable(false); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const material = materials.find(item => item.id === materialId);
  return <div className="exam-workspace">
    <div className="page-heading"><p className="eyebrow">YOUR STUDY SPACE</p><h1>Exam preparation</h1><p className="page-subtitle">Use specific notes or choose a saved lecture to practice in the way that suits you.</p></div>
    <NotesExam />
    <div className="section-heading"><h2>Practice a saved lecture</h2></div>
    {loading ? <div className="loading-state" role="status">Opening your lectures…</div> : error ? <div className="error-panel" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : materials.length === 0 ? <div className="empty-state"><h2>Start with a lecture</h2><p>Add lecture notes before starting exam practice.</p><Link href="/materials/new" className="button button-primary">Add a lecture</Link></div> : <>
      <div className="form-panel exam-setup">
        <div className="field"><label className="field-label" htmlFor="exam-material">Choose a lecture</label><select id="exam-material" className="text-input" value={materialId} onChange={event => setMaterialId(event.target.value)}><option value="">Select a lecture</option>{materials.map(item => <option key={item.id} value={item.id}>{item.course} · {item.title}</option>)}</select></div>
        <fieldset className="exam-modes"><legend className="field-label">Choose a practice format</legend><div className="view-switch" role="group" aria-label="Practice format"><button type="button" aria-pressed={mode === "written"} onClick={() => setMode("written")}>Written</button><button type="button" aria-pressed={mode === "oral"} onClick={() => setMode("oral")}>Oral</button><button type="button" aria-pressed={mode === "mcq"} onClick={() => setMode("mcq")}>Multiple choice</button></div></fieldset>
      </div>
      {material && (mode === "mcq" ? <MultipleChoice key={material.id} material={readingMaterial(material)} /> : <Practice key={`${material.id}-${mode}`} material={readingMaterial(material)} mode={mode} aiAvailable={aiAvailable} />)}
    </>}
  </div>;
}

function NotesExam() {
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const upload = useRef<AbortController | null>(null);
  useEffect(() => () => upload.current?.abort(), []);

  async function importFile(file?: File) {
    if (!file || busy) return;
    setError("");
    if (!/\.(txt|md|pdf|pptx)$/i.test(file.name)) { setError("Choose a TXT, MD, PDF, or PPTX file."); return; }
    if (file.size > 10_000_000) { setError("Choose a file smaller than 10 MB."); return; }
    const controller = new AbortController(); upload.current = controller; setBusy(true);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/sources/extract", { method: "POST", body: form, signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "This file could not be imported.");
      const result = body as ExtractedSourceResponse;
      if (!controller.signal.aborted) { setNotes(result.text); setFileName(result.name); setWarnings(result.warnings); }
    } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "This file could not be imported."); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length !== 1) { setError("Drop one file at a time."); return; }
    void importFile(event.dataTransfer.files[0]);
  }

  return <section className="exam-notes" aria-labelledby="notes-exam-title">
    <div className="section-heading"><div><p className="section-kicker">PRACTICE WITH YOUR NOTES</p><h2 id="notes-exam-title">Create an exam from specific notes</h2></div></div>
    {submitted === null ? <div className="form-panel">
      <p className="field-help">Paste notes or import a file. Review the text before creating multiple-choice questions. These notes are not added to your library.</p>
      <div className="upload-zone exam-upload" onDragOver={event => event.preventDefault()} onDrop={dropFile}>
        <Icon name="upload" size={24} /><div><strong>Drop a file here or choose one</strong><p className="field-help">TXT, MD, PDF, or PPTX · up to 10 MB</p></div>
        <label className="button button-secondary button-small" htmlFor="exam-note-file">Choose file</label><input id="exam-note-file" className="sr-only" type="file" accept=".txt,.md,.pdf,.pptx" disabled={busy} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
      </div>
      {busy && <p role="status" className="field-help">Importing your notes…</p>}
      {fileName && <p className="field-help">Imported: {fileName}. Review or edit the extracted text below.</p>}
      {warnings.length > 0 && <ul className="source-warning-list">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      {error && <p className="error-panel" role="alert">{error}</p>}
      <div className="field exam-note-text"><label className="field-label" htmlFor="exam-notes">Notes to practice</label><textarea id="exam-notes" className="text-area" value={notes} maxLength={100000} disabled={busy} onChange={event => setNotes(event.target.value)} placeholder="Paste your lecture notes here…" /><span className="field-help">{notes.length.toLocaleString()} / 100,000 characters · at least 30 characters required</span></div>
      <button type="button" className="button button-primary" disabled={busy || notes.trim().length < 30 || notes.length > 100000} onClick={() => setSubmitted(notes)}>Use these notes</button>
    </div> : <><button type="button" className="button button-secondary button-small exam-change-notes" onClick={() => setSubmitted(null)}>Change notes</button><MultipleChoice notes={submitted} /></>}
  </section>;
}

function Practice({ material, mode, aiAvailable }: { material: Material; mode: "written" | "oral"; aiAvailable: boolean }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const { preferences } = useReadingPreferences();
  const sections = material.sections.filter(section => section.text.trim());
  const section = sections[index];
  const count = sections.length;

  function move(next: number) { setIndex(next); setAnswer(""); setRevealed(false); }
  function sectionLabel(item: MaterialSection) { return `Section ${sections.indexOf(item) + 1}: ${item.title}`; }
  const prompt = mode === "oral" ? `Explain ${section?.title} aloud in your own words. What are the important points?` : `Summarize ${section?.title} in your own words. What are the important points?`;

  if (!count || !section) return <div className="empty-state exam-empty"><h2>More text needed</h2><p>This lecture has no readable sections yet. Add notes or a transcript to start practicing.</p><Link href={`/read/${material.id}`} className="button button-secondary">Open lecture</Link></div>;

  return <section className="exam-practice" aria-labelledby="practice-title">
    <div className="section-heading"><div><p className="section-kicker">{mode.toUpperCase()} PRACTICE</p><h2 id="practice-title">{material.title}</h2></div><span className="badge badge-muted" role="status">{index + 1} of {count}</span></div>
    <div className={`reader-paper exam-paper theme-${preferences.theme}`} style={readingStyle(preferences)}>
      <div className="reading-sample"><p>{prompt}</p><p>{mode === "oral" ? "Speak your answer. The coach replies aloud, then you can try again." : "Write your response, then compare it with the lecture notes."}</p></div>
    </div>
      <ReadAloud text={prompt} label="Read question aloud" />
      {mode === "oral"
        ? <ExamVoice key={section.id} materialId={material.id} sectionId={section.id} prompt={prompt} aiAvailable={aiAvailable} />
        : <div className="field exam-answer"><label htmlFor="practice-answer" className="field-label">Your answer</label><textarea id="practice-answer" className="text-area" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Your thoughts…" /></div>}
      <button type="button" className="button button-secondary" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? "Hide lecture notes" : "Compare with lecture notes"}</button>
      {revealed && <div className={`exam-reference theme-${preferences.theme}`} style={readingStyle(preferences)}><p className="reader-source-label">{sectionLabel(section)} · {section.sourceLabel}</p><div className="reading-sample"><p>{section.text}</p></div></div>}
      <p className="source-note">{mode === "oral" ? "The coach replies from this section. The conversation stays in this browser and clears when you move to another question. It is not saved." : "Review your answer yourself against the notes. Answers are not automatically graded or saved; moving to another question clears them."}</p>
    <nav className="section-navigation" aria-label="Practice questions"><button type="button" className="button button-secondary" disabled={index === 0} onClick={() => move(index - 1)}><Icon name="back" size={17} />Previous</button><button type="button" className="button button-primary" disabled={index >= count - 1} onClick={() => move(index + 1)}>Next<Icon name="arrow" size={17} /></button></nav>
    <p className="source-note">Practice uses {material.compilation ? "your compiled study notes, which may contain AI errors" : "your original lecture sections"}. <Link href={`/read/${material.id}`}>Open the lecture</Link> to check the full context.</p>
  </section>;
}

function MultipleChoice({ material, notes }: { material?: Material; notes?: string }) {
  const { preferences } = useReadingPreferences();
  const promptId = useId();
  const [data, setData] = useState<MultipleChoiceResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function generate() {
    const controller = new AbortController();
    request.current = controller; setLoading(true); setError("");
    try {
      const url = material ? `/api/materials/${encodeURIComponent(material.id)}/exam-questions` : "/api/exam-questions";
      const result = await apiRequest<MultipleChoiceResponse>(url, { method: "POST", body: JSON.stringify(material ? { prompt } : { notes, prompt }), signal: controller.signal });
      if (!controller.signal.aborted) { setData(result); setIndex(0); setAnswer(null); setAnswers({}); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Questions could not be created.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  const question = data?.questions[index];
  const checked = answers[index];
  const score = data?.questions.filter((item, position) => answers[position] === item.correctIndex).length ?? 0;
  const section = material?.sections.find(item => item.id === question?.sectionId);
  function move(next: number) { setIndex(next); setAnswer(null); }

  if (!question) return <section className="exam-practice"><h2>Multiple-choice practice</h2><p className="page-subtitle">Answer questions about the ideas in your notes, then compare the explanation with the supporting passage.</p><div className="field exam-prompt"><label className="field-label" htmlFor={promptId}>What kind of questions would you like? <span className="optional">Optional</span></label><textarea id={promptId} className="text-area exam-prompt-input" value={prompt} maxLength={1000} disabled={loading} onChange={event => setPrompt(event.target.value)} placeholder="For example: focus on key definitions and use practical examples." /><span className="field-help">Choose a topic, difficulty, or style. Questions will be multiple choice and must be supported by your notes.</span></div><p className="source-note">Creating questions sends your notes and preferences to the configured AI provider.</p>{error && <p className="error-panel" role="alert">{error}</p>}<button type="button" className="button button-primary" disabled={loading} onClick={generate}>{loading ? "Creating questions…" : "Create questions"}</button>{loading && <p role="status" className="source-note">Creating your practice questions…</p>}</section>;

  return <section className="exam-practice" aria-labelledby={`${promptId}-title`}>
    <div className="section-heading"><div><p className="section-kicker">MULTIPLE-CHOICE PRACTICE</p><h2 id={`${promptId}-title`}>{material?.title ?? "Your notes"}</h2></div><span className="badge badge-muted" role="status">{index + 1} of {data.questions.length}</span></div>
    <div className={`reader-paper exam-paper theme-${preferences.theme}`} style={readingStyle(preferences)}><div className="reading-sample"><p>{question.question}</p><fieldset className="exam-options" disabled={checked !== undefined}><legend>Choose one answer</legend>{question.options.map((option, optionIndex) => <label className="exam-option" key={optionIndex}><input type="radio" name={`${promptId}-question-${index}`} checked={(checked ?? answer) === optionIndex} onChange={() => setAnswer(optionIndex)} /><span>{option}</span></label>)}</fieldset></div></div>
    <ReadAloud text={`${question.question} ${question.options.map((option, i) => `Option ${i + 1}. ${option}`).join(" ")}`} label="Read question and answers aloud" />
    {checked === undefined && <button type="button" className="button button-primary exam-check" disabled={answer === null} onClick={() => { if (answer !== null) setAnswers(current => ({ ...current, [index]: answer })); }}>Check answer</button>}
    {checked !== undefined && <div className="notice" role="status"><div><strong>{checked === question.correctIndex ? "Correct." : "Not quite."}</strong> Answer: {question.options[question.correctIndex]}.<p>{question.explanation}</p><p><strong>Supporting passage{section ? ` · ${section.title}` : ""}:</strong> {question.evidence}</p></div></div>}
    <p className="source-note">Score: {score} correct out of {Object.keys(answers).length} answered. Results last only for this session. AI-generated questions can contain errors; check the supporting passage.</p>
    {data.warning && <p className="notice" role="status">{data.warning}</p>}
    {Object.keys(answers).length > 0 && <button type="button" className="button button-ghost button-small" onClick={() => { setAnswers({}); move(0); }}>Start again</button>}
    <button type="button" className="button button-ghost button-small" onClick={() => { setData(null); setAnswers({}); move(0); }}>Create new questions</button>
    <nav className="section-navigation" aria-label="Practice questions"><button type="button" className="button button-secondary" disabled={index === 0} onClick={() => move(index - 1)}><Icon name="back" size={17} />Previous</button><button type="button" className="button button-primary" disabled={index >= data.questions.length - 1} onClick={() => move(index + 1)}>Next<Icon name="arrow" size={17} /></button></nav>
    <p className="source-note">{material ? <><Link href={`/read/${material.id}`}>Open the lecture</Link> to check the full context.</> : "Use Change notes to review the full text."}</p>
  </section>;
}
