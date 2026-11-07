"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { readingStyle } from "@/components/preference-controls";
import { ReadAloud } from "@/components/read-aloud";
import { useReadingPreferences } from "@/components/reading-preferences-provider";
import { apiRequest } from "@/lib/client/api";
import type { Material, MaterialListResponse, MaterialSection, MultipleChoiceResponse } from "@/lib/contracts";
import { readingMaterial } from "@/lib/lecture";

type Mode = "written" | "oral" | "mcq";

export default function ExamPreparationPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [materialId, setMaterialId] = useState("");
  const [mode, setMode] = useState<Mode>("written");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiRequest<MaterialListResponse>("/api/materials", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setMaterials(data.materials); })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We could not load your lectures."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const material = materials.find(item => item.id === materialId);
  return <div className="exam-workspace">
    <div className="page-heading"><p className="eyebrow">YOUR STUDY SPACE</p><h1>Exam preparation</h1><p className="page-subtitle">Choose a lecture and practice in the way that suits you. Take your time and return to your notes whenever you need.</p></div>
    {loading ? <div className="loading-state" role="status">Opening your lectures…</div> : error ? <div className="error-panel" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : materials.length === 0 ? <div className="empty-state"><h2>Start with a lecture</h2><p>Add lecture notes before starting exam practice.</p><Link href="/materials/new" className="button button-primary">Add a lecture</Link></div> : <>
      <div className="form-panel exam-setup">
        <div className="field"><label className="field-label" htmlFor="exam-material">Choose a lecture</label><select id="exam-material" className="text-input" value={materialId} onChange={event => setMaterialId(event.target.value)}><option value="">Select a lecture</option>{materials.map(item => <option key={item.id} value={item.id}>{item.course} · {item.title}</option>)}</select></div>
        <fieldset className="exam-modes"><legend className="field-label">Choose a practice format</legend><div className="view-switch" role="group" aria-label="Practice format"><button type="button" aria-pressed={mode === "written"} onClick={() => setMode("written")}>Written</button><button type="button" aria-pressed={mode === "oral"} onClick={() => setMode("oral")}>Oral</button><button type="button" aria-pressed={mode === "mcq"} onClick={() => setMode("mcq")}>Multiple choice</button></div></fieldset>
      </div>
      {material && (mode === "mcq" ? <MultipleChoice key={material.id} material={readingMaterial(material)} /> : <Practice key={`${material.id}-${mode}`} material={readingMaterial(material)} mode={mode} />)}
    </>}
  </div>;
}

function Practice({ material, mode }: { material: Material; mode: "written" | "oral" }) {
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
      <div className="reading-sample"><p>{prompt}</p><p>{mode === "oral" ? "Say your answer aloud, or write a few notes if you prefer." : "Write your response, then compare it with the lecture notes."}</p></div>
    </div>
      <ReadAloud text={prompt} label="Read question aloud" />
      <div className="field exam-answer"><label htmlFor="practice-answer" className="field-label">{mode === "oral" ? "Optional notes" : "Your answer"}</label><textarea id="practice-answer" className="text-area" value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Your thoughts…" /></div>
      <button type="button" className="button button-secondary" aria-expanded={revealed} onClick={() => setRevealed(value => !value)}>{revealed ? "Hide lecture notes" : "Compare with lecture notes"}</button>
      {revealed && <div className={`exam-reference theme-${preferences.theme}`} style={readingStyle(preferences)}><p className="reader-source-label">{sectionLabel(section)} · {section.sourceLabel}</p><div className="reading-sample"><p>{section.text}</p></div></div>}
      <p className="source-note">Review your answer yourself against the notes. Answers are not automatically graded or saved; moving to another question clears them.</p>
    <nav className="section-navigation" aria-label="Practice questions"><button type="button" className="button button-secondary" disabled={index === 0} onClick={() => move(index - 1)}><Icon name="back" size={17} />Previous</button><button type="button" className="button button-primary" disabled={index >= count - 1} onClick={() => move(index + 1)}>Next<Icon name="arrow" size={17} /></button></nav>
    <p className="source-note">Practice uses {material.compilation ? "your compiled study notes, which may contain AI errors" : "your original lecture sections"}. <Link href={`/read/${material.id}`}>Open the lecture</Link> to check the full context.</p>
  </section>;
}

function MultipleChoice({ material }: { material: Material }) {
  const { preferences } = useReadingPreferences();
  const [data, setData] = useState<MultipleChoiceResponse | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function generate() {
    const controller = new AbortController();
    request.current = controller; setLoading(true); setError("");
    try {
      const result = await apiRequest<MultipleChoiceResponse>(`/api/materials/${encodeURIComponent(material.id)}/exam-questions`, { method: "POST", body: "{}", signal: controller.signal });
      if (!controller.signal.aborted) { setData(result); setIndex(0); setAnswer(null); setAnswers({}); }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Questions could not be created.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }

  const question = data?.questions[index];
  const checked = answers[index];
  const score = data?.questions.filter((item, position) => answers[position] === item.correctIndex).length ?? 0;
  const section = material.sections.find(item => item.id === question?.sectionId);
  function move(next: number) { setIndex(next); setAnswer(null); }

  if (!question) return <section className="exam-practice"><h2>Multiple-choice practice</h2><p className="page-subtitle">Answer questions about the ideas in your lecture, then compare the explanation with the supporting passage.</p><p className="source-note">For your own lectures, creating questions sends the lecture text to the configured AI provider. The included sample uses ready-made questions and does not send its text.</p>{error && <p className="error-panel" role="alert">{error}</p>}<button type="button" className="button button-primary" disabled={loading} onClick={generate}>{loading ? "Creating questions…" : "Create questions"}</button>{loading && <p role="status" className="source-note">Creating your practice questions…</p>}</section>;

  return <section className="exam-practice" aria-labelledby="mcq-title">
    <div className="section-heading"><div><p className="section-kicker">MULTIPLE-CHOICE PRACTICE</p><h2 id="mcq-title">{material.title}</h2></div><span className="badge badge-muted" role="status">{index + 1} of {data.questions.length}</span></div>
    <div className={`reader-paper exam-paper theme-${preferences.theme}`} style={readingStyle(preferences)}><div className="reading-sample"><p>{question.question}</p><fieldset className="exam-options" disabled={checked !== undefined}><legend>Choose one answer</legend>{question.options.map((option, optionIndex) => <label className="exam-option" key={optionIndex}><input type="radio" name={`question-${index}`} checked={(checked ?? answer) === optionIndex} onChange={() => setAnswer(optionIndex)} /><span>{option}</span></label>)}</fieldset></div></div>
    <ReadAloud text={`${question.question} ${question.options.map((option, i) => `Option ${i + 1}. ${option}`).join(" ")}`} label="Read question and answers aloud" />
    {checked === undefined && <button type="button" className="button button-primary exam-check" disabled={answer === null} onClick={() => { if (answer !== null) setAnswers(current => ({ ...current, [index]: answer })); }}>Check answer</button>}
    {checked !== undefined && <div className="notice" role="status"><div><strong>{checked === question.correctIndex ? "Correct." : "Not quite."}</strong> Answer: {question.options[question.correctIndex]}.<p>{question.explanation}</p><p><strong>Supporting passage{section ? ` · ${section.title}` : ""}:</strong> {question.evidence}</p></div></div>}
    <p className="source-note">Score: {score} correct out of {Object.keys(answers).length} answered. Results last only for this session. {data.origin === "ai" ? "AI-generated questions can contain errors; check the supporting passage." : "Questions for the sample lecture were written for this demo."}</p>
    {Object.keys(answers).length > 0 && <button type="button" className="button button-ghost button-small" onClick={() => { setAnswers({}); move(0); }}>Start again</button>}
    <nav className="section-navigation" aria-label="Practice questions"><button type="button" className="button button-secondary" disabled={index === 0} onClick={() => move(index - 1)}><Icon name="back" size={17} />Previous</button><button type="button" className="button button-primary" disabled={index >= data.questions.length - 1} onClick={() => move(index + 1)}>Next<Icon name="arrow" size={17} /></button></nav>
    <p className="source-note"><Link href={`/read/${material.id}`}>Open the lecture</Link> to check the full context.</p>
  </section>;
}
