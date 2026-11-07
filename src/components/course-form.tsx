"use client";

import { useId, useState, type FormEvent } from "react";
import type { CourseResponse, CourseSummary } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { Icon } from "./icon";

export function CourseForm({ onSaved, onCancel }: { onSaved: (course: CourseSummary) => void; onCancel?: () => void }) {
  const id = useId();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [term, setTerm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    try {
      const { course } = await apiRequest<CourseResponse>("/api/courses", { method: "POST", body: JSON.stringify({ name, code, term }) });
      setName(""); setCode(""); setTerm(""); onSaved(course);
    } catch (error) { setError(error instanceof Error ? error.message : "Your course could not be saved."); }
    finally { setPending(false); }
  }

  return <form className="course-form" onSubmit={submit} aria-label="Add a course">
    <div className="field"><label className="field-label" htmlFor={`${id}-name`}>Course name</label><input id={`${id}-name`} className="text-input" value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Introduction to psychology" required maxLength={100} disabled={pending} /></div>
    <div className="form-grid">
      <div className="field"><label className="field-label" htmlFor={`${id}-code`}>Course code <span className="optional">Optional</span></label><input id={`${id}-code`} className="text-input" value={code} onChange={event => setCode(event.target.value)} placeholder="e.g. PSY 101" maxLength={24} disabled={pending} /></div>
      <div className="field"><label className="field-label" htmlFor={`${id}-term`}>Term <span className="optional">Optional</span></label><input id={`${id}-term`} className="text-input" value={term} onChange={event => setTerm(event.target.value)} placeholder="e.g. Autumn 2026" maxLength={60} disabled={pending} /></div>
    </div>
    {error && <p className="error-panel" role="alert">{error}</p>}
    <div className="form-actions">{onCancel && <button type="button" className="button button-ghost" disabled={pending} onClick={onCancel}>Cancel</button>}<button type="submit" className="button button-primary" disabled={pending}><Icon name="plus" size={18} />{pending ? "Saving course…" : "Save course"}</button></div>
  </form>;
}
