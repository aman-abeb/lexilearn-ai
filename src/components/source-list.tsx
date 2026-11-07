"use client";

import type { LectureSourceInput } from "@/lib/contracts";
import { looksLikeSlideText, SOURCE_LABELS } from "@/lib/lecture";
import { readingStyle } from "./preference-controls";
import { useReadingPreferences } from "./reading-preferences-provider";
import { Icon } from "./icon";

function downloadTranscript(source: LectureSourceInput) {
  const url = URL.createObjectURL(new Blob([source.text], { type: "text/plain;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url;
  anchor.download = source.transcript ? `youtube-${source.transcript.videoId}-transcript.txt` : "lecture-transcript.txt";
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SourceList({ sources, onRemove, showText = false, selectedId, onEdit }: {
  sources: (LectureSourceInput & { id?: string })[];
  onRemove?: (index: number) => void;
  showText?: boolean;
  selectedId?: string;
  onEdit?: (sourceId: string) => void;
}) {
  const { preferences } = useReadingPreferences();
  return <ul className="source-list">{sources.map((source, index) => <li className="source-card" key={source.id ?? index} id={source.id ? `source-${source.id}` : undefined}>
    <div className="source-card-heading"><span className="source-icon"><Icon name={source.kind === "recording" ? "recording" : source.kind === "slides" ? "slides" : "file"} size={21} /></span><div className="source-card-title"><h3>{source.name}</h3><p className="field-help">{SOURCE_LABELS[source.kind]} · {source.text.trim() ? source.kind === "recording" ? looksLikeSlideText(source.text) ? "Slide-like text supplied" : "Transcript supplied" : "Text ready" : "Transcript needed"}</p></div>{onRemove && <button type="button" className="icon-button" onClick={() => onRemove(index)} aria-label={`Remove ${source.name}`}><Icon name="close" size={18} /></button>}</div>
    {source.transcript && <p className="field-help source-caption-info">YouTube · {source.transcript.languageName} captions · {source.transcript.automatic ? "Auto-generated" : "Published captions"}{source.transcript.edited ? " · Edited by you" : ""}</p>}
    {source.url && <a className="source-recording-link" href={source.url} target="_blank" rel="noopener noreferrer">{source.transcript ? "Open YouTube video" : "Open recording"}<Icon name="external" size={16} /><span className="sr-only"> in a new tab</span></a>}
    {!source.text.trim() && <p className="field-help source-missing">The link is saved. Add a transcript to include the spoken content in compiled notes.</p>}
    {source.kind === "recording" && looksLikeSlideText(source.text) && <p className="field-help source-missing">The supplied text looks like slides and speaker notes. It is not verified recording speech; the recording link itself has not been transcribed.</p>}
    {onEdit && source.id && <button type="button" className="button button-ghost button-small source-edit" onClick={() => onEdit(source.id!)}>{source.kind === "recording" && !source.text.trim() ? "Add transcript" : "Edit source"}<span className="sr-only"> for {source.name}</span></button>}
    {showText && (source.kind === "recording" || source.kind === "transcript") && source.text.trim() && <button type="button" className="button button-ghost button-small" onClick={() => downloadTranscript(source)}><Icon name="download" size={16} />Download transcript<span className="sr-only"> for {source.name}</span></button>}
    {showText && source.text.trim() && <details className="source-text-details" open={selectedId === source.id || undefined} key={`${source.id}-${selectedId === source.id}`}><summary>Read original source</summary><div className={`source-original theme-${preferences.theme}`} style={readingStyle(preferences)}><p className="reading-sample">{source.text}</p></div></details>}
    {showText && source.warnings?.map(warning => <p className="field-help" key={warning}>{warning}</p>)}
  </li>)}</ul>;
}
