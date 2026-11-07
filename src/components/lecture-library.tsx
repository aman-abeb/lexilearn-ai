"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CourseListResponse, CourseSummary, Material, MaterialListResponse } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { getMaterialProgress } from "@/lib/client/reading-progress";
import { lectureStatus, readingMaterial, SOURCE_LABELS } from "@/lib/lecture";
import { Icon } from "./icon";
import { useReadingProgress } from "./reading-progress-provider";
import { FlowArtwork } from "./flow-artwork";

export function LectureLibrary({ courseId }: { courseId?: string }) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { progress } = useReadingProgress();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    Promise.all([
      apiRequest<MaterialListResponse>("/api/materials", { signal: controller.signal }),
      apiRequest<CourseListResponse>("/api/courses", { signal: controller.signal }),
    ]).then(([lectures, catalog]) => { if (!controller.signal.aborted) { setMaterials(lectures.materials); setCourses(catalog.courses); } }).catch(error => { if (!controller.signal.aborted) setError(error.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const course = courses.find(course => course.id === courseId);
  const activeCourse = courseId ?? selectedCourse;
  const courseLectures = materials.filter(material => !activeCourse || material.courseId === activeCourse);
  const visible = courseLectures.filter(material => `${material.title} ${material.course} lecture ${material.lectureNumber}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => activeCourse ? a.lectureNumber - b.lectureNumber : b.createdAt.localeCompare(a.createdAt));
  const continuing = courseLectures.find(material => {
    const reader = readingMaterial(material);
    const saved = getMaterialProgress(reader, progress[material.id]);
    return saved.lastSectionId && saved.completedSectionIds.length < reader.sections.length;
  });
  const addHref = activeCourse ? `/materials/new?course=${encodeURIComponent(activeCourse)}` : "/materials/new";

  if (!loading && courseId && !course && !error) return <div className="empty-state"><h1>Course not found</h1><p>Choose one of your saved courses to continue.</p><Link href="/courses" className="button button-primary">Your courses</Link></div>;

  return <>
    {courseId && <Link href="/courses" className="back-link"><Icon name="back" size={17} />All courses</Link>}
    <header className="page-heading heading-row library-welcome"><div><p className="eyebrow">{course ? [course.code, course.term].filter(Boolean).join(" · ") || "A little more clarity" : "A LITTLE MORE ROOM TO LEARN"}</p><h1>{course?.name ?? "Back to your flow."}</h1><p className="page-subtitle">{course ? `Your lectures, in order. Next up: Lecture ${course.nextLectureNumber}.` : "Your notes, your ideas, your next little breakthrough."}</p></div><FlowArtwork variant={course ? "course" : "notes"} className="welcome-art" /><Link href={addHref} className="button button-primary"><Icon name="plus" size={19} />Add lecture</Link></header>
    {!loading && !error && continuing && <section className="continue-panel" aria-labelledby="continue-heading"><span className="continue-icon"><Icon name="book" size={27} /></span><div><p className="eyebrow">Right where you left off</p><h2 id="continue-heading">{continuing.title}</h2><p>{continuing.course} · Lecture {continuing.lectureNumber}</p></div><Link href={`/read/${continuing.id}`} className="button button-secondary" aria-label={`Continue ${continuing.title}`}>Continue reading<Icon name="arrow" size={18} /></Link></section>}
    {!courseId && !loading && !error && <section className="course-strip" aria-labelledby="course-strip-heading"><div className="section-heading"><h2 id="course-strip-heading">Your courses</h2><Link className="text-link" href="/courses">Manage courses<Icon name="arrow" size={16} /></Link></div><div className="course-strip-grid">{courses.slice(0, 3).map(course => <Link href={`/courses/${course.id}`} className="course-shortcut" key={course.id}><span className="course-icon"><Icon name="courses" size={21} /></span><span><strong>{course.code || course.name}</strong><small>{course.code ? course.name : `${course.lectureCount} ${course.lectureCount === 1 ? "lecture" : "lectures"}`}</small></span></Link>)}<Link href="/courses" className="course-shortcut course-shortcut-add"><Icon name="plus" size={20} /><span>Add a course</span></Link></div></section>}
    <section aria-labelledby="lectures-heading">
      <div className="section-heading"><h2 id="lectures-heading">{courseId ? "Course lectures" : "Your lectures"}</h2>{!loading && !error && <span className="count-label" role="status">{visible.length} {visible.length === 1 ? "lecture" : "lectures"}</span>}</div>
      <div className="library-filters"><div className="search-field"><label className="sr-only" htmlFor="lecture-search">Search lectures</label><Icon name="search" size={19} /><input id="lecture-search" type="search" placeholder="Find a lecture…" value={search} onChange={event => setSearch(event.target.value)} /></div>{!courseId && <div className="course-filter"><label className="sr-only" htmlFor="course-filter">Filter by course</label><select className="text-input" id="course-filter" value={selectedCourse} onChange={event => setSelectedCourse(event.target.value)}><option value="">All courses</option>{courses.map(course => <option key={course.id} value={course.id}>{course.code ? `${course.code} · ` : ""}{course.name}</option>)}</select></div>}</div>
      {loading ? <div className="loading-state" role="status">Opening your lecture space…</div> : error ? <div className="error-panel" role="alert"><h3>Your lectures could not load</h3><p>{error}</p><button type="button" className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : !visible.length ? <div className="empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>{search ? "No lectures match that search" : "A fresh page for this course"}</h3><p>{search ? "Try a lecture title or a different course." : "Add the notes, slides, or recording from your first lecture."}</p>{search ? <button type="button" className="button button-secondary" onClick={() => setSearch("")}>Clear search</button> : <Link href={addHref} className="button button-primary">Add your first lecture</Link>}</div> : <div className="library-grid">{visible.map(material => {
        const reader = readingMaterial(material);
        const saved = getMaterialProgress(reader, progress[material.id]);
        const lastSection = reader.sections.find(section => section.id === saved.lastSectionId);
        const sourceKinds = [...new Set(material.sources.map(source => source.kind))];
        const description = material.compilation?.overview ?? material.sections[0]?.text ?? "Your recording link is saved. Add its transcript to build study notes.";
        return <article className="material-card" key={material.id}>
          <div className="material-card-top"><span className="lecture-card-number">Lecture {String(material.lectureNumber).padStart(2, "0")}</span><span className={`badge ${material.compilation ? "" : "badge-muted"}`}>{material.isSample ? "Sample lecture" : lectureStatus(material)}</span></div>
          <p className="material-meta">{material.course}</p>
          <h3 className="material-title"><Link href={`/read/${material.id}`}>{material.title}</Link></h3>
          <p className="material-description">{description.slice(0, 160)}{description.length > 160 ? "…" : ""}</p>
          <div className="source-chips">{sourceKinds.map(kind => <span key={kind}><Icon name={kind === "recording" ? "recording" : kind === "slides" ? "slides" : "file"} size={15} />{SOURCE_LABELS[kind]}</span>)}</div>
          {lastSection && <div className="card-reading-progress"><span>{saved.completedSectionIds.length} of {reader.sections.length} sections read</span>{saved.reviewSectionIds.length > 0 && <span>{saved.reviewSectionIds.length} to revisit</span>}</div>}
          <div className="material-footer"><span>{material.sources.length} {material.sources.length === 1 ? "source" : "sources"}{reader.sections.length > 0 && ` · ${reader.sections.length} sections`}</span><Link className="material-open" href={`/read/${material.id}`} aria-label={`${lastSection ? "Continue" : "Open"} ${material.title}`}>{lastSection ? "Continue" : "Open lecture"}<Icon name="arrow" size={18} /></Link></div>
        </article>;
      })}</div>}
    </section>
    <p className="quiet-note"><Icon name="sliders" size={18} />Made for your pace. Change your <Link href="/preferences">reading preferences</Link> whenever you need.</p>
  </>;
}
