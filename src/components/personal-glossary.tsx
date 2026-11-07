"use client";

import { useId, useState, type FormEvent } from "react";
import type { Material, MaterialSection } from "@/lib/contracts";
import { glossaryEntrySchema, type GlossaryEntry } from "@/lib/client/reading-progress";
import { readingStyle } from "./preference-controls";
import { useReadingPreferences } from "./reading-preferences-provider";
import { useReadingProgress } from "./reading-progress-provider";

export function PersonalGlossary({ material, section, entries, onOpenSection, onOpenSource }: {
  material: Material;
  section: MaterialSection;
  entries: GlossaryEntry[];
  onOpenSection: (sectionId: string) => void;
  onOpenSource?: (sourceId: string) => void;
}) {
  const id = useId();
  const [term, setTerm] = useState("");
  const [meaning, setMeaning] = useState("");
  const [message, setMessage] = useState("");
  const { preferences } = useReadingPreferences();
  const { updateProgress, ready, storageAvailable } = useReadingProgress();

  function saveTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const existing = entries.find(entry => entry.sectionId === section.id && entry.term.toLowerCase() === term.trim().toLowerCase());
    if (!existing && entries.length >= 100) { setMessage("Your glossary has 100 terms. Remove a term before adding another."); return; }
    const result = glossaryEntrySchema.safeParse({ id: existing?.id ?? crypto.randomUUID(), term, meaning, sectionId: section.id, sourceIds: section.sourceIds, sectionTitle: section.title });
    if (!result.success) { setMessage("Add a term and a meaning using more than spaces."); return; }
    updateProgress(material, current => ({
      ...current,
      glossary: existing ? current.glossary.map(entry => entry.id === existing.id ? result.data : entry) : [...current.glossary, result.data],
    }));
    setTerm(""); setMeaning("");
    setMessage(`${result.data.term} ${existing ? "updated" : "added"} in your glossary.`);
  }

  return <details className="study-panel">
    <summary>My glossary <span className="badge badge-muted">{entries.length} {entries.length === 1 ? "term" : "terms"}</span></summary>
    <div className="study-panel-content">
      <p className="field-help">Write a meaning in your own words or copy a course definition. Each note links back to its source section.</p>
      <form onSubmit={saveTerm}>
        <div className="field"><label className="field-label" htmlFor={`${id}-term`}>Term from {section.title}</label><input className="text-input" id={`${id}-term`} value={term} onChange={event => setTerm(event.target.value)} maxLength={80} required placeholder="e.g. overfitting" /></div>
        <div className="field"><label className="field-label" htmlFor={`${id}-meaning`}>Meaning in my words</label><textarea className="text-area glossary-meaning" id={`${id}-meaning`} value={meaning} onChange={event => setMeaning(event.target.value)} maxLength={500} required placeholder="What does this term mean in this lecture?" /></div>
        <div className="form-actions"><button type="submit" className="button button-secondary" disabled={!ready}>Save term</button><span className="field-help">Save the same term again in this section to update it.</span></div>
      </form>
      <p className="field-help" role="status">{message}</p>
      {entries.length > 0 && <ul className="glossary-list">{entries.map(entry => {
        const source = material.sections.find(item => item.id === entry.sectionId);
        const originalSourceId = entry.sourceIds?.find(id => material.sources.some(item => item.id === id));
        return <li key={entry.id}>
          <div className={`glossary-entry theme-${preferences.theme}`} style={readingStyle(preferences)}><div className="reading-sample"><h3>{entry.term}</h3><p>{entry.meaning}</p></div></div>
          <div className="glossary-actions"><button type="button" className="button button-ghost button-small" onClick={() => source ? onOpenSection(entry.sectionId) : originalSourceId && onOpenSource?.(originalSourceId)}>{source ? `Return to ${source.title}` : "Open original source"}</button><button type="button" className="button button-ghost button-small" aria-label={`Remove ${entry.term} from glossary`} onClick={() => {
            updateProgress(material, current => ({ ...current, glossary: current.glossary.filter(item => item.id !== entry.id) }));
            setMessage(`${entry.term} removed from your glossary.`);
          }}>Remove</button></div>
        </li>;
      })}</ul>}
      <p className="source-note">Your own study notes, not AI-generated definitions. {storageAvailable ? "Saved in this browser." : "Browser storage is unavailable. Notes will last until this page is reloaded."}</p>
    </div>
  </details>;
}
