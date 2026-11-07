"use client";

import { useState } from "react";
import type { AdaptationMode, AdaptationResponse, AdaptationResult, LectureSource, MaterialSection } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { Icon } from "./icon";
import { readingStyle } from "./preference-controls";
import { ReadAloud } from "./read-aloud";
import { useReadingPreferences } from "./reading-preferences-provider";

const modes: { mode: AdaptationMode; label: string }[] = [
  { mode: "plain-language", label: "Explain simply" },
  { mode: "steps", label: "Break into steps" },
  { mode: "terms", label: "Explain terms" },
];

export function SectionHelp({ materialId, section, sources, aiAvailable, onOpenSource }: {
  materialId: string;
  section: MaterialSection;
  sources: LectureSource[];
  aiAvailable: boolean;
  onOpenSource: (id: string) => void;
}) {
  const { preferences } = useReadingPreferences();
  const [activeMode, setActiveMode] = useState<AdaptationMode | null>(null);
  const [results, setResults] = useState<Partial<Record<AdaptationMode, AdaptationResult>>>({});
  const [pending, setPending] = useState<AdaptationMode | null>(null);
  const [error, setError] = useState("");
  const result = activeMode ? results[activeMode] : undefined;
  const activeLabel = modes.find(item => item.mode === activeMode)?.label;

  async function ask(mode: AdaptationMode) {
    setActiveMode(mode);
    setPending(mode);
    setError("");
    try {
      const response = await apiRequest<AdaptationResponse>(`/api/materials/${materialId}/adapt`, {
        method: "POST",
        body: JSON.stringify({ sectionId: section.id, mode }),
      });
      setResults(current => ({ ...current, [mode]: response.adaptation }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Section help could not finish. The original section is still here.");
    } finally {
      setPending(null);
    }
  }

  const pendingLabel = modes.find(item => item.mode === pending)?.label.toLowerCase();

  return (
    <section className="section-help" aria-labelledby={`help-${section.id}`}>
      <h2 id={`help-${section.id}`}>Help with this section</h2>
      <p>Ask for another way to read this section. The original stays above, and each explanation stays linked to its sources.</p>
      {aiAvailable ? (
        <div className="control-group" role="group" aria-label="Ways to restudy this section">
          {modes.map(item => (
            <button type="button" key={item.mode} className="button button-secondary button-small" aria-pressed={activeMode === item.mode} disabled={pending !== null} onClick={() => void ask(item.mode)}>{item.label}</button>
          ))}
        </div>
      ) : <p className="field-help">Section help is not connected yet. You can keep reading this section.</p>}
      {pendingLabel && <p className="notice" role="status" aria-busy="true">Preparing {pendingLabel}… The original section stays available.</p>}
      {error && (
        <div className="error-panel" role="alert">
          <p>{error}</p>
          {activeMode && <button type="button" className="button button-secondary button-small" onClick={() => void ask(activeMode)}>Try again</button>}
        </div>
      )}
      {result && activeLabel && (
        <div className={`section-help-result theme-${preferences.theme}`} style={readingStyle(preferences)}>
          <p className="reader-source-label">Generated study help · {activeLabel}</p>
          <p className="reader-text">{result.text}</p>
          {result.warnings.length > 0 && (
            <div className="section-help-warnings">
              <p>Check this</p>
              <ul>{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
            </div>
          )}
          <div className="section-citations">
            <span>Based on this section</span>
            {section.sourceIds?.map(id => {
              const name = sources.find(source => source.id === id)?.name ?? "View source";
              return <button type="button" key={id} onClick={() => onOpenSource(id)}>{name}<Icon name="external" size={13} /></button>;
            })}
          </div>
          <ReadAloud text={result.text} label="Read this explanation aloud" />
        </div>
      )}
    </section>
  );
}
