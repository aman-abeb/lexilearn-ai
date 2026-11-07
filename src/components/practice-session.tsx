"use client";

import { useEffect, useId, useState } from "react";
import type { Material, PracticeCheck, PracticeHintResponse, PracticeProblem, PracticeProblemResponse, PracticeVerdict } from "@/lib/contracts";
import { readingMaterial } from "@/lib/lecture";
import { apiRequest } from "@/lib/client/api";
import { Icon } from "./icon";
import { readingStyle } from "./preference-controls";
import { ReadAloud } from "./read-aloud";
import { useReadingPreferences } from "./reading-preferences-provider";

const verdictLabel: Record<PracticeVerdict, string> = {
  "on-track": "On track",
  partly: "Partly there",
  revisit: "Revisit this idea",
};

function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <div className="section-help-warnings"><p>Check this</p><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>;
}

export function PracticeSession({
  material, aiAvailable, focusSectionId, onOpenSection,
}: {
  material: Material;
  aiAvailable: boolean;
  focusSectionId: string;
  onOpenSection: (sectionId: string, markRevisit: boolean) => void;
}) {
  const id = useId();
  const { preferences } = useReadingPreferences();
  const sections = readingMaterial(material).sections;
  const [sectionId, setSectionId] = useState(focusSectionId);
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hintsLeft, setHintsLeft] = useState(2);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<PracticeCheck | null>(null);
  const [pending, setPending] = useState<"start" | "hint" | "check" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (focusSectionId && readingMaterial(material).sections.some(section => section.id === focusSectionId)) setSectionId(focusSectionId);
  }, [focusSectionId, material]);

  const selected = sections.some(section => section.id === sectionId) ? sectionId : "";

  async function start() {
    setPending("start"); setError("");
    try {
      const response = await apiRequest<PracticeProblemResponse>(`/api/materials/${material.id}/practice`, {
        method: "POST",
        body: JSON.stringify(selected ? { sectionId: selected } : {}),
      });
      setProblem(response.problem);
      setHints([]);
      setHintsLeft(response.problem.hintsAvailable);
      setAnswer("");
      setResult(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The practice problem could not be written. The lecture is still here.");
    } finally { setPending(null); }
  }

  async function hint() {
    if (!problem) return;
    setPending("hint"); setError("");
    try {
      const response = await apiRequest<PracticeHintResponse>(`/api/materials/${material.id}/practice/hint`, {
        method: "POST",
        body: JSON.stringify({ problemId: problem.id }),
      });
      setHints(current => [...current, response.hint]);
      setHintsLeft(response.hintsLeft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The hint could not be prepared. Your attempt is still here.");
    } finally { setPending(null); }
  }

  async function check() {
    if (!problem || !answer.trim()) return;
    setPending("check"); setError("");
    try {
      const response = await apiRequest<{ result: PracticeCheck }>(`/api/materials/${material.id}/practice/check`, {
        method: "POST",
        body: JSON.stringify({ problemId: problem.id, answer: answer.trim() }),
      });
      setResult(response.result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your attempt could not be checked. It is still on the page.");
    } finally { setPending(null); }
  }

  return <section className="practice-session" aria-labelledby={`${id}-heading`}>
    <header className="section-heading">
      <div>
        <h2 id={`${id}-heading`}>Practice this lecture</h2>
        <p className="page-subtitle">Try one problem before any answer appears. Ask for a hint if you want a nudge, then check your attempt. The worked steps stay hidden until you do.</p>
      </div>
    </header>
    {!aiAvailable && <p className="field-help">Study help is not connected yet. You can keep reading the lecture.</p>}
    <div className="practice-setup">
      <label className="field-label" htmlFor={`${id}-section`}>Where should the problem come from?</label>
      <select id={`${id}-section`} className="text-input" value={selected} disabled={pending !== null} onChange={event => setSectionId(event.target.value)}>
        <option value="">The whole lecture</option>
        {sections.map((section, index) => <option key={section.id} value={section.id}>{index + 1}. {section.title}</option>)}
      </select>
      <button type="button" className="button button-primary" disabled={!aiAvailable || pending !== null} onClick={() => void start()}>
        <Icon name="practice" size={18} />{problem ? "Try another problem" : "Start a problem"}
      </button>
    </div>
    {pending === "start" && <p className="notice" role="status" aria-busy="true">Writing a problem from this lecture… Your notes stay available.</p>}
    {error && <p className="error-panel" role="alert">{error}</p>}
    {problem && <div className="practice-work">
      <div className={`section-help-result theme-${preferences.theme}`} style={readingStyle(preferences)}>
        <p className="reader-source-label">Practice problem · {problem.concept}</p>
        <p className="reader-text">{problem.prompt}</p>
        <p className="source-note">This problem uses {problem.sectionTitle}. The answer is not on this page yet.</p>
        <Warnings warnings={problem.warnings} />
        <ReadAloud text={problem.prompt} label="Read this problem aloud" />
      </div>
      {hints.length > 0 && <div>
        <h3 className="practice-label">Hints</h3>
        <ol className="practice-hints">{hints.map(item => <li key={item}>{item}</li>)}</ol>
      </div>}
      <form className="practice-form" onSubmit={event => { event.preventDefault(); void check(); }}>
        <label className="field-label" htmlFor={`${id}-answer`}>Your attempt</label>
        <textarea id={`${id}-answer`} className="text-area" rows={5} value={answer} maxLength={2000} disabled={pending !== null} onChange={event => setAnswer(event.target.value)} placeholder="Write what you think, in your own words…" />
        <div className="conversation-actions">
          <div className="control-group">
            <button type="button" className="button button-secondary" disabled={!aiAvailable || pending !== null || hintsLeft === 0} onClick={() => void hint()}>
              {pending === "hint" ? "Preparing a hint…" : hintsLeft === 0 ? "No hints left" : `Hint (${hintsLeft} left)`}
            </button>
            <button type="submit" className="button button-primary" disabled={!aiAvailable || pending !== null || !answer.trim()}>
              {pending === "check" ? "Checking…" : result ? "Check again" : "Check my attempt"}
            </button>
          </div>
        </div>
      </form>
      {result && <div className={`section-help-result theme-${preferences.theme}`} style={readingStyle(preferences)} role="status">
        <p className="reader-source-label">Feedback</p>
        <h3 className="reader-text">{verdictLabel[result.verdict]}</h3>
        <p className="reader-text">{result.feedback}</p>
        <h3 className="practice-label">What a strong answer includes</h3>
        <p className="reader-text">{result.whatToInclude}</p>
        <h3 className="practice-label">Worked steps</h3>
        <ol className="takeaway-list">{result.steps.map(step => <li key={step} className="reader-text">{step}</li>)}</ol>
        <Warnings warnings={result.warnings} />
        <div className="conversation-actions">
          <button type="button" className="button button-secondary" onClick={() => onOpenSection(result.sectionId, result.verdict === "revisit")}>
            Open {result.sectionTitle}<Icon name="arrow" size={18} />
          </button>
        </div>
        <ReadAloud text={`${verdictLabel[result.verdict]}. ${result.feedback}`} label="Read this feedback aloud" />
      </div>}
    </div>}
  </section>;
}
