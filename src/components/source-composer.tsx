"use client";

import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { ExtractedSourceResponse, LectureSourceInput, YouTubeImportResponse, YouTubeTranscriptMetadata } from "@/lib/contracts";
import { sourceInputSchema } from "@/lib/validation";
import { apiRequest } from "@/lib/client/api";
import { looksLikeSlideText, recordingLinkHelp } from "@/lib/lecture";
import { parseYouTubeUrl } from "@/lib/youtube";
import { Icon } from "./icon";

const options = [
  { kind: "notes", label: "Notes", description: "Written lecture material", icon: "file" },
  { kind: "slides", label: "Slides", description: "Slide deck or PDF", icon: "slides" },
  { kind: "recording", label: "Recording", description: "YouTube, link, or transcript", icon: "recording" },
] as const;
type Choice = typeof options[number]["kind"];
export type SourceDraftState = { hasContent: boolean; hasReadableText: boolean; canImportCaptions: boolean; busy: boolean };
type CaptionRequest = { key: string; controller: AbortController; promise: Promise<YouTubeImportResponse> };

export function SourceComposer({ onAdd, onCancel, disabled = false, initialSource, formId, onSaveLecture, onDraftStateChange }: {
  onAdd: (source: LectureSourceInput) => Promise<void> | void;
  onCancel?: () => void;
  disabled?: boolean;
  initialSource?: LectureSourceInput;
  formId?: string;
  onSaveLecture?: (source: LectureSourceInput | null, compile: boolean) => Promise<void>;
  onDraftStateChange?: (state: SourceDraftState) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<Choice>(initialSource?.kind === "transcript" ? "recording" : initialSource?.kind ?? "notes");
  const [name, setName] = useState(initialSource?.name ?? "");
  const [text, setText] = useState(initialSource?.text ?? "");
  const [url, setUrl] = useState(initialSource?.url ?? "");
  const [warnings, setWarnings] = useState<string[]>(initialSource?.warnings ?? []);
  const [transcript, setTranscript] = useState<YouTubeTranscriptMetadata | undefined>(initialSource?.transcript);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [youtubeLoading, setYouTubeLoading] = useState(false);
  const [youtubeError, setYouTubeError] = useState("");
  const [youtubeResult, setYouTubeResult] = useState<YouTubeImportResponse | null>(null);
  const autoName = useRef(initialSource?.transcript ? initialSource.name : "");
  const inFlight = useRef<CaptionRequest | null>(null);
  const lastAttempt = useRef(initialSource?.transcript?.videoId ?? "");
  const youtube = kind === "recording" ? parseYouTubeUrl(url) : null;
  const youtubeKey = youtube?.videoId ?? "";
  const currentKey = useRef(youtubeKey);
  currentKey.current = youtubeKey;
  const locked = busy || youtubeLoading || disabled;
  const accepts = kind === "recording" ? ".txt,.vtt,.srt" : kind === "slides" ? ".pdf,.pptx,.txt,.md" : ".txt,.md,.pdf";
  const hasContent = !!(text.trim() || url.trim() || name.trim());
  const hasReadableText = !!text.trim();
  const canImportCaptions = !!youtube && !youtubeError;
  const slideTextInRecording = kind === "recording" && looksLikeSlideText(text);

  useEffect(() => {
    onDraftStateChange?.({ hasContent, hasReadableText, canImportCaptions, busy: busy || youtubeLoading });
  }, [hasContent, hasReadableText, canImportCaptions, busy, youtubeLoading, onDraftStateChange]);

  const importCaptions = useCallback((): Promise<YouTubeImportResponse> => {
    if (!youtube) return Promise.reject(new Error("Paste a valid YouTube video link first."));
    if (inFlight.current?.key === youtubeKey) return inFlight.current.promise;
    inFlight.current?.controller.abort();
    const controller = new AbortController();
    lastAttempt.current = youtubeKey;
    setYouTubeLoading(true); setYouTubeError(""); setError("");
    const promise = apiRequest<YouTubeImportResponse>("/api/sources/youtube", {
      method: "POST", signal: controller.signal, body: JSON.stringify({ url: youtube.url }),
    }).then(result => {
      if (controller.signal.aborted || currentKey.current !== youtubeKey) throw new DOMException("Caption import cancelled", "AbortError");
      setText(result.source.text); setWarnings(result.source.warnings ?? []); setTranscript(result.source.transcript); setYouTubeResult(result);
      const previousAutoName = autoName.current;
      setName(current => !current.trim() || current === previousAutoName ? result.source.name : current);
      autoName.current = result.source.name;
      return result;
    }).catch(error => {
      if (!controller.signal.aborted && currentKey.current === youtubeKey) setYouTubeError(error instanceof Error ? error.message : "YouTube captions could not be imported.");
      throw error;
    }).finally(() => {
      if (inFlight.current?.controller === controller) { inFlight.current = null; setYouTubeLoading(false); }
    });
    inFlight.current = { key: youtubeKey, controller, promise };
    return promise;
  }, [youtube?.videoId, youtube?.url, youtubeKey]);

  useEffect(() => {
    setYouTubeError(""); setYouTubeResult(null); setYouTubeLoading(false);
    return () => {
      if (inFlight.current?.key === youtubeKey) { inFlight.current.controller.abort(); inFlight.current = null; }
    };
  }, [youtubeKey]);

  useEffect(() => {
    if (!youtube || disabled || lastAttempt.current === youtubeKey || (text.trim() && (!transcript || transcript.edited))) return;
    const timer = window.setTimeout(() => { if (lastAttempt.current !== youtubeKey) void importCaptions().catch(() => undefined); }, 650);
    return () => window.clearTimeout(timer);
  }, [youtubeKey, importCaptions, text, transcript, disabled]);

  function changeRecordingUrl(value: string) {
    const next = parseYouTubeUrl(value);
    if (transcript && transcript.videoId !== next?.videoId) {
      if (!transcript.edited) { setText(""); setWarnings([]); }
      setTranscript(undefined);
      setName(current => current === autoName.current ? "" : current);
    }
    setUrl(value); setError("");
  }

  async function importFile(file?: File) {
    if (!file || locked) return;
    setError(""); setBusy(true); setImporting(true);
    try {
      if (file.size > 10_000_000) throw new Error("Choose a file smaller than 10 MB.");
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!accepts.split(",").includes(extension)) throw new Error(`For this source, choose ${accepts.replaceAll(",", ", ")} files.`);
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/sources/extract", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "This file could not be imported.");
      const result = body as ExtractedSourceResponse;
      setText(result.text); setName(result.name); setWarnings(result.warnings); setTranscript(undefined); setYouTubeResult(null);
    } catch (error) { setError(error instanceof Error ? error.message : "This file could not be imported."); }
    finally { setBusy(false); setImporting(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (locked) return;
    const action = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
    const linkOnly = action === "save-link-only";
    const savingLecture = !!onSaveLecture && (action === "save-lecture" || action === "compile-lecture" || linkOnly);
    setBusy(true);
    try {
      if (savingLecture && !hasContent) { await onSaveLecture!(null, action === "compile-lecture"); return; }
      let sourceText = text;
      let sourceName = name;
      let sourceWarnings = warnings;
      let sourceTranscript = transcript;
      if (youtube && !sourceText.trim() && !linkOnly) {
        const result = await importCaptions();
        sourceText = result.source.text; sourceName = sourceName.trim() || result.source.name; sourceWarnings = result.source.warnings ?? []; sourceTranscript = result.source.transcript;
      }
      if (linkOnly) { sourceText = ""; sourceTranscript = undefined; sourceWarnings = ["YouTube captions were not imported. This video link is saved as a reference only."]; }
      const source = sourceInputSchema.safeParse({
        kind: kind === "recording" && !url.trim() ? "transcript" : kind,
        name: sourceName.trim() || (youtube ? "YouTube video" : kind === "recording" ? url.trim() ? "Lecture recording" : "Recording transcript" : kind === "slides" ? "Lecture slides" : "Lecture notes"),
        text: sourceText, ...(kind === "recording" && url.trim() ? { url: sourceTranscript && youtube ? youtube.url : url.trim() } : {}), warnings: sourceWarnings,
        ...(kind === "recording" && sourceTranscript ? { transcript: sourceTranscript } : {}),
      });
      if (!source.success) { setError(source.error.issues[0].message); return; }
      if (savingLecture) { await onSaveLecture!(source.data, action === "compile-lecture"); return; }
      await onAdd(source.data);
      setText(""); setName(""); setUrl(""); setWarnings([]); setTranscript(undefined); setYouTubeResult(null);
    } catch (error) { setError(error instanceof Error ? error.message : "This source could not be saved."); }
    finally { setBusy(false); }
  }

  function downloadCaptions() {
    if (!youtubeResult || !youtube) return;
    const blobUrl = URL.createObjectURL(new Blob([youtubeResult.captionsVtt], { type: "text/vtt;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = blobUrl; anchor.download = `youtube-${youtube.videoId}-captions.vtt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  return <form id={formId} className="source-composer" onSubmit={submit} aria-label="Add a lecture source" aria-busy={busy || youtubeLoading}>
    <fieldset className="source-type-fieldset" disabled={locked}><legend className="field-label">What would you like to add?</legend><div className="source-type-grid">{options.map(option => <label key={option.kind} className={`source-type ${kind === option.kind ? "is-selected" : ""}`}>
      <input type="radio" name={`${id}-kind`} value={option.kind} checked={kind === option.kind} onChange={() => { setKind(option.kind); setError(""); }} />
      <Icon name={option.icon} size={22} /><span><strong>{option.label}</strong><small>{option.description}</small></span>
    </label>)}</div></fieldset>
    {kind === "recording" && <div className="field"><label className="field-label" htmlFor={`${id}-url`}>Recording link <span className="optional">YouTube, Webex, or a lecture page</span></label><input id={`${id}-url`} className="text-input" type="url" value={url} onChange={event => changeRecordingUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" maxLength={2000} disabled={busy || disabled} aria-describedby={`${id}-recording-help`} /><p className="field-help" id={`${id}-recording-help`}>{recordingLinkHelp(url)}</p></div>}
    {youtube && <section className="youtube-import-panel" aria-label="YouTube captions">
      <div className="youtube-import-heading"><div><strong>YouTube → transcript → study notes</strong><p className="field-help">Available captions are imported automatically. Review the transcript below, then create study notes.</p></div></div>
      {youtubeLoading ? <div className="caption-import-status"><p className="field-help" role="status">Importing YouTube captions…</p><button type="button" className="button button-ghost button-small" onClick={() => { inFlight.current?.controller.abort(); setYouTubeLoading(false); setYouTubeError("Caption import cancelled. Retry, provide a transcript, or save the link only."); }}>Cancel import</button></div> : <>
        {transcript && <p className="caption-import-success" role="status"><Icon name="check" size={17} />{transcript.languageName} captions {transcript.edited ? "imported and edited" : "imported"}{transcript.automatic ? " · Auto-generated" : " · Published captions"}{youtubeResult ? ` · ${youtubeResult.cueCount} captions` : ""}</p>}
        {youtubeError && <p className="error-panel" role="alert">{youtubeError}</p>}
        {!transcript && text.trim() && <p className="field-help">Your existing text is kept. Importing captions will replace the transcript text in this editor.</p>}
        <div className="control-group"><button type="button" className="button button-secondary button-small" disabled={locked} onClick={() => void importCaptions().catch(() => undefined)}><Icon name="download" size={17} />{youtubeError ? "Retry caption import" : text.trim() ? "Replace text with YouTube captions" : "Import YouTube captions"}</button>{youtubeResult && !transcript?.edited && <button type="button" className="button button-ghost button-small" onClick={downloadCaptions}><Icon name="download" size={17} />Download captions (.vtt)</button>}{youtubeError && !text.trim() && <button type="submit" name="source-action" value="save-link-only" className="button button-ghost button-small" disabled={locked}>Save link only</button>}</div>
      </>}
    </section>}
    <div className="upload-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void importFile(event.dataTransfer.files[0]); }}>
      <span className="source-icon"><Icon name="upload" size={22} /></span><div><strong>{kind === "recording" ? "Or import a transcript file" : kind === "slides" ? "Import your slides" : "Import your lecture notes"}</strong><p className="field-help">{accepts.replaceAll(".", "").replaceAll(",", ", ").toUpperCase()} · Up to 10 MB</p></div>
      <input ref={input} type="file" className="sr-only" tabIndex={-1} accept={accepts} disabled={locked} aria-label="Choose source file" onChange={(event: ChangeEvent<HTMLInputElement>) => { void importFile(event.target.files?.[0]); event.target.value = ""; }} />
      <button type="button" className="button button-secondary" disabled={locked} onClick={() => input.current?.click()}>{importing ? "Reading file…" : "Choose file"}</button>
    </div>
    <div className="field"><label className="field-label" htmlFor={`${id}-text`}>{kind === "recording" ? "Transcript text" : "Source text"} <span className="optional">{kind === "recording" ? youtube ? "Imported captions, or your own transcript" : "Or save the link for later" : "Paste or review imported text"}</span></label><textarea className="text-area source-text-input" id={`${id}-text`} value={text} onChange={event => { setText(event.target.value); if (transcript) setTranscript({ ...transcript, edited: true }); }} maxLength={100_000} rows={6} disabled={locked} placeholder={kind === "recording" ? "YouTube captions will appear here, or paste your own transcript…" : "Paste lecture content here, or choose a file above…"} /><span className="character-count">{text.length.toLocaleString()} / 100,000 characters</span></div>
    {slideTextInRecording && <p className="notice" role="status">This looks like extracted slide text and speaker notes, not a recording transcript. You can save the text, but it does not establish what was spoken in the recording. Add the slide file under Slides and the exported transcript under Recording when available.</p>}
    <div className="field"><label className="field-label" htmlFor={`${id}-name`}>Source name <span className="optional">Optional</span></label><input id={`${id}-name`} className="text-input" value={name} onChange={event => setName(event.target.value)} placeholder={kind === "slides" ? "e.g. Lecturer’s slides" : kind === "recording" ? "e.g. Lecture recording" : "e.g. My lecture notes"} maxLength={200} disabled={locked} /></div>
    {warnings.length > 0 && <div className="extraction-notes">{warnings.map(warning => <p className="field-help" key={warning}>{warning}</p>)}</div>}
    {error && error !== youtubeError && <div className="error-panel" role="alert">{error}</div>}
    {onSaveLecture && <p className="field-help">For one source, use Save &amp; open lecture below. Use Add source if you want to collect another source first.</p>}
    <div className="form-actions">{onCancel && <button type="button" className="button button-ghost" onClick={onCancel} disabled={locked}>Cancel</button>}<button type="submit" className="button button-secondary" disabled={locked}><Icon name={initialSource ? "check" : "plus"} size={18} />{busy && !importing ? "Saving source…" : initialSource ? "Save source" : "Add source"}</button></div>
  </form>;
}
