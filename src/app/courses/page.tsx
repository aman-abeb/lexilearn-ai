"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CourseListResponse, CourseSummary } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { CourseForm } from "@/components/course-form";
import { Icon } from "@/components/icon";
import { FlowArtwork } from "@/components/flow-artwork";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const formHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    apiRequest<CourseListResponse>("/api/courses", { signal: controller.signal }).then(data => { if (!controller.signal.aborted) setCourses(data.courses); }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  function openForm() { setAdding(true); requestAnimationFrame(() => formHeading.current?.focus()); }

  return <>
    <header className="page-heading heading-row"><div><p className="eyebrow">A home for every subject</p><h1>Your courses</h1><p className="page-subtitle">Set up your courses once. Keep each lecture in its place.</p></div><button type="button" className="button button-primary" onClick={openForm} disabled={adding}><Icon name="plus" size={18} />Add course</button></header>
    {adding && <section className="form-panel course-create-panel" aria-labelledby="course-form-heading"><h2 id="course-form-heading" ref={formHeading} tabIndex={-1}>Add a course</h2><CourseForm onSaved={course => { setCourses(current => [...current, course]); setAdding(false); setMessage(`${course.name} is ready. You can add its first lecture.`); }} onCancel={() => setAdding(false)} /></section>}
    {message && <p className="notice" role="status"><Icon name="check" size={18} />{message}</p>}
    {loading ? <div className="loading-state" role="status">Loading your courses…</div> : error ? <div className="error-panel" role="alert"><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : !courses.length ? <div className="empty-state"><Icon name="courses" size={30} /><h2>Start with a course</h2><p>Your lectures will be numbered and organized inside it.</p><button type="button" className="button button-primary" onClick={openForm}>Add your first course</button></div> : <div className="course-grid">{courses.map(course => <article className="course-card" key={course.id}>
      <div className="course-card-top"><span className="course-icon"><Icon name="courses" size={23} /></span><FlowArtwork variant="course" className="course-card-art" />{course.isSample && <span className="badge badge-muted">Sample</span>}</div>
      <p className="course-code">{course.code || "Your course"}{course.term && ` · ${course.term}`}</p>
      <h2><Link href={`/courses/${course.id}`}>{course.name}</Link></h2>
      <p className="field-help">{course.lectureCount} {course.lectureCount === 1 ? "lecture" : "lectures"} · Next: Lecture {course.nextLectureNumber}</p>
      <div className="course-card-actions"><Link href={`/courses/${course.id}`} className="material-open" aria-label={`Open ${course.name}`}>Open course<Icon name="arrow" size={18} /></Link><Link href={`/materials/new?course=${course.id}`} className="icon-button" aria-label={`Add lecture to ${course.name}`}><Icon name="plus" size={20} /></Link></div>
    </article>)}</div>}
    <p className="quiet-note"><Icon name="check" size={18} />Lecture numbers are assigned automatically, starting from 1 in each course.</p>
  </>;
}
