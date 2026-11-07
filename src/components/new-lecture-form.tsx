"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { CourseListResponse, CourseSummary, LectureSourceInput, Material, MaterialResponse } from "@/lib/contracts";
import { sourceListSchema } from "@/lib/validation";
import { apiRequest } from "@/lib/client/api";
import { CourseForm } from "./course-form";
import { Icon } from "./icon";
import { SourceComposer, type SourceDraftState } from "./source-composer";
import { SourceList } from "./source-list";

export function NewLectureForm({ initialCourseId }: { initialCourseId?: string }) {
  const router = useRouter();
  const sourceFormId = useId();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [courseId, setCourseId] = useState(initialCourseId ?? "");
  const [title, setTitle] = useState("");
  const [sources, setSources] = useState<LectureSourceInput[]>([]);
  const [compilationAvailable, setCompilationAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState(1);
  const [addingCourse, setAddingCourse] = useState(false);
  const [addingSource, setAddingSource] = useState(true);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [savedLecture, setSavedLecture] = useState<Material | null>(null);
  const [draftState, setDraftState] = useState<SourceDraftState>({ hasContent: false, hasReadableText: false, canImportCaptions: false, busy: false });
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const saving = useRef(false);
  const course = courses.find(course => course.id === courseId);
  const editingDraft = addingSource && !savedLecture;
  const draftBusy = editingDraft && draftState.busy;
  const canSave = sources.length > 0 || (editingDraft && draftState.hasContent);
  const canCompile = compilationAvailable && (sources.some(source => source.text.trim()) || (editingDraft && (draftState.hasReadableText || draftState.canImportCaptions)));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError("");
    apiRequest<CourseListResponse>("/api/courses", { signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return;
      setCourses(data.courses); setCompilationAvailable(data.compilationAvailable);
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  function changeStep(value: number) {
    setStep(value); setError("");
    requestAnimationFrame(() => stepHeading.current?.focus());
  }

  function nextStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!course) { setError("Choose a saved course to continue."); return; }
    if (!title.trim()) { setError("Add a lecture title to continue."); return; }
    changeStep(2);
  }

  async function save(compile: boolean, draft?: LectureSourceInput | null) {
    if (saving.current) return;
    setError("");
    const result = sourceListSchema.safeParse(draft ? [...sources, draft] : sources);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    saving.current = true;
    setSources(result.data); setAddingSource(false);
    setPending(true); setStatus(savedLecture ? "Opening saved lecture…" : "Saving your lecture…");
    try {
      let material = savedLecture;
      if (!material) {
        const data = await apiRequest<MaterialResponse>("/api/materials", { method: "POST", body: JSON.stringify({ title: title.trim(), courseId, sources: result.data }) });
        material = data.material; setSavedLecture(material);
      }
      if (compile) {
        setStatus("Bringing your sources together into study notes. This can take a little while…");
        await apiRequest<MaterialResponse>(`/api/materials/${material.id}/compile`, { method: "POST", body: "{}" });
      }
      router.push(`/read/${material.id}`);
    } catch (error) { setError(error instanceof Error ? error.message : "Your lecture could not be saved."); setPending(false); setStatus(""); saving.current = false; }
  }

  return <div className="lecture-builder">
    <Link href={course ? `/courses/${course.id}` : "/"} className="back-link"><Icon name="back" size={17} />{course ? "Back to course" : "Back to lectures"}</Link>
    <header className="page-heading"><p className="eyebrow">A little preparation. A clearer lecture.</p><h1>Add a lecture</h1><p className="page-subtitle">Keep the notes, slides, and recording together. We’ll help you work through them at your own pace.</p></header>
    <ol className="form-steps" aria-label="Lecture setup"><li aria-current={step === 1 ? "step" : undefined} className={step > 1 ? "is-complete" : ""}><span>{step > 1 ? <Icon name="check" size={18} /> : "1"}</span>Lecture details</li><li aria-current={step === 2 ? "step" : undefined}><span>2</span>Lecture sources</li></ol>
    {loading ? <div className="loading-state" role="status">Loading your courses…</div> : loadError ? <div className="error-panel" role="alert"><p>{loadError}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : <>
      <section className="form-panel builder-panel" hidden={step !== 1} aria-labelledby="lecture-details-heading">
        <div className="section-heading"><h2 id="lecture-details-heading" ref={step === 1 ? stepHeading : undefined} tabIndex={-1}>First, where does this lecture belong?</h2></div>
        <form onSubmit={nextStep}>
          <div className="field"><label className="field-label" htmlFor="lecture-course">Course</label><div className="course-select-row"><select id="lecture-course" className="text-input" value={courseId} onChange={event => setCourseId(event.target.value)} required><option value="">Choose a saved course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ""}{course.name}</option>)}</select><button type="button" className="button button-ghost" aria-expanded={addingCourse} onClick={() => setAddingCourse(value => !value)}><Icon name="plus" size={18} />New course</button></div><p className="field-help">Add your course once. It will be here for every new lecture.</p></div>
          {course && <div className="lecture-number-preview" role="status"><span className="lecture-number">{String(course.nextLectureNumber).padStart(2, "0")}</span><div><strong>Lecture {course.nextLectureNumber}</strong><p className="field-help">Numbered automatically within {course.code || course.name}.</p></div></div>}
          <div className="field"><label className="field-label" htmlFor="lecture-title">Lecture title</label><input id="lecture-title" className="text-input" value={title} onChange={event => setTitle(event.target.value)} required maxLength={120} placeholder="e.g. Memory and how we learn" /></div>
          {error && step === 1 && <div className="error-panel" role="alert">{error}</div>}
          <div className="form-actions"><Link href="/dashboard" className="button button-ghost">Cancel</Link><button className="button button-primary" type="submit" disabled={addingCourse}>Continue to sources<Icon name="arrow" size={18} /></button></div>
        </form>
        {addingCourse && <section className="inline-course-panel" aria-labelledby="inline-course-heading"><h3 id="inline-course-heading">Add a course</h3><CourseForm onSaved={course => { setCourses(current => [...current, course]); setCourseId(course.id); setAddingCourse(false); requestAnimationFrame(() => document.getElementById("lecture-course")?.focus()); }} onCancel={() => setAddingCourse(false)} /></section>}
      </section>
      <section className="form-panel builder-panel" hidden={step !== 2} aria-labelledby="lecture-sources-heading" aria-busy={pending}>
        <div className="lecture-context"><span className="badge">Lecture {savedLecture?.lectureNumber ?? course?.nextLectureNumber}</span><span>{course?.code || course?.name}</span></div>
        <h2 id="lecture-sources-heading" ref={step === 2 ? stepHeading : undefined} tabIndex={-1}>{title || "Bring your lecture together"}</h2>
        <p className="page-subtitle">Add one source to begin. You can add more to this lecture later.</p>
        {sources.length > 0 && <section className="added-sources" aria-label="Added lecture sources"><div className="section-heading"><h3>Added sources</h3><span className="badge badge-muted" role="status">{sources.length} / 12</span></div><SourceList sources={sources} onRemove={pending || savedLecture ? undefined : index => setSources(current => current.filter((_, sourceIndex) => sourceIndex !== index))} /></section>}
        {!savedLecture && (addingSource ? <SourceComposer formId={sourceFormId} disabled={pending} onDraftStateChange={setDraftState} onSaveLecture={(source, compile) => save(compile, source)} onAdd={source => {
          const result = sourceListSchema.safeParse([...sources, source]);
          if (!result.success) throw new Error(result.error.issues[0].message);
          setSources(result.data); setAddingSource(false); setError("");
        }} onCancel={sources.length ? () => setAddingSource(false) : undefined} /> : <button type="button" className="button button-secondary add-another-source" disabled={pending || sources.length >= 12} onClick={() => setAddingSource(true)}><Icon name="plus" size={18} />Add another source</button>)}
        {canSave && !compilationAvailable && <p className="field-help compilation-availability">AI compilation is not connected yet. Your sources will be saved together, ready to read and compile when it is connected.</p>}
        {error && step === 2 && <div className="error-panel" role="alert">{savedLecture && <strong>Your lecture has been saved. </strong>}{error}</div>}
        <p className="save-status" role="status">{status}</p>
        {!pending && <p className="field-help" id={`${sourceFormId}-save-help`} role="status">{draftBusy ? "Finishing the source import. Saving will be available when it is ready." : editingDraft && draftState.hasContent ? "Saving includes the source you are editing. You do not need to press Add source first." : sources.length ? "Your added sources are ready to save. An empty source editor will be skipped." : "Paste a recording link, enter source text, or choose a file to save your lecture."}</p>}
        <div className="form-actions">
          <button type="button" className="button button-ghost" disabled={pending || !!savedLecture} onClick={() => changeStep(1)}><Icon name="back" size={17} />Lecture details</button>
          <div className="control-group"><button type={editingDraft ? "submit" : "button"} form={editingDraft ? sourceFormId : undefined} name="source-action" value="save-lecture" className={`button ${canCompile ? "button-secondary" : "button-primary"}`} disabled={pending || draftBusy || !canSave} aria-describedby={!pending ? `${sourceFormId}-save-help` : undefined} onClick={editingDraft ? undefined : () => void save(false)}>{savedLecture ? "Open saved lecture" : "Save & open lecture"}</button>{canCompile && <button type={editingDraft ? "submit" : "button"} form={editingDraft ? sourceFormId : undefined} name="source-action" value="compile-lecture" className="button button-primary" disabled={pending || draftBusy || !canSave} onClick={editingDraft ? undefined : () => void save(true)}><Icon name="sparkles" size={18} />{savedLecture ? "Try compiling again" : "Create study notes"}</button>}</div>
        </div>
      </section>
    </>}
    <p className="quiet-note"><Icon name="book" size={18} />Your original sources stay available alongside your study notes.</p>
  </div>;
}
