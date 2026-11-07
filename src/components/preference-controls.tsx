"use client";

import { useId, type CSSProperties } from "react";
import type { ReadingPreferences } from "@/lib/contracts";
import { useReadingPreferences } from "./reading-preferences-provider";

export function readingStyle(preferences: ReadingPreferences): CSSProperties {
  return {
    "--reading-size": `${preferences.fontSize}px`,
    "--reading-line": preferences.lineHeight,
    "--reading-spacing": `${preferences.letterSpacing}em`,
    "--reading-font": preferences.fontFamily === "serif" ? "Georgia, 'Times New Roman', serif" : "Arial, Helvetica, sans-serif",
  } as CSSProperties;
}

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const { preferences, updatePreferences, resetPreferences, storageAvailable, ready } = useReadingPreferences();
  return <div className="preference-panel">
    <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-size`}>Text size <span>{preferences.fontSize} px</span></label>
      <input id={`${id}-size`} type="range" min="16" max="32" step="1" value={preferences.fontSize} disabled={!ready} onChange={event => updatePreferences({ fontSize: Number(event.target.value) })} />
      <div className="range-labels" aria-hidden="true"><span>Smaller</span><span>Larger</span></div>
    </div>
    <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-line`}>Line spacing <span>{preferences.lineHeight.toFixed(1)}</span></label>
      <input id={`${id}-line`} type="range" min="1.5" max="2.5" step="0.1" value={preferences.lineHeight} disabled={!ready} onChange={event => updatePreferences({ lineHeight: Number(event.target.value) })} />
      <div className="range-labels" aria-hidden="true"><span>Closer</span><span>More space</span></div>
    </div>
    <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-letters`}>Letter spacing <span>{Math.round(preferences.letterSpacing * 100)}%</span></label>
      <input id={`${id}-letters`} type="range" min="0" max="0.12" step="0.01" value={preferences.letterSpacing} disabled={!ready} onChange={event => updatePreferences({ letterSpacing: Number(event.target.value) })} />
    </div>
    <fieldset className="preference-control"><legend className="field-label">Typeface</legend>
      <div className="segmented-control"><button type="button" aria-pressed={preferences.fontFamily === "sans"} disabled={!ready} onClick={() => updatePreferences({ fontFamily: "sans" })}>Sans serif</button><button type="button" aria-pressed={preferences.fontFamily === "serif"} disabled={!ready} onClick={() => updatePreferences({ fontFamily: "serif" })}>Serif</button></div>
    </fieldset>
    <fieldset className="preference-control"><legend className="field-label">Page colour</legend>
      <div className="segmented-control">{(["paper", "white", "night"] as const).map(theme => <button type="button" key={theme} aria-pressed={preferences.theme === theme} disabled={!ready} onClick={() => updatePreferences({ theme })}>{theme === "paper" ? "Warm" : theme === "white" ? "White" : "Dark"}</button>)}</div>
    </fieldset>
    {!compact && <div className="preference-control"><label className="checkbox-control"><input type="checkbox" checked={preferences.sentenceGuide} disabled={!ready} onChange={event => updatePreferences({ sentenceGuide: event.target.checked })} /><span><strong>Sentence guide</strong><small>Read one sentence at a time within a section. Turn it off to see the full paragraph.</small></span></label></div>}
    {!compact && <label className="checkbox-control"><input type="checkbox" checked={preferences.focusMode} disabled={!ready} onChange={event => updatePreferences({ focusMode: event.target.checked })} /><span><strong>Focus view</strong><small>Hide the navigation while reading. Use Exit focus to bring it back.</small></span></label>}
    <button type="button" className="button button-ghost button-small" disabled={!ready} onClick={resetPreferences}>Reset reading settings</button>
    <p className="field-help">{storageAvailable ? "Settings are saved in this browser. Choose what feels comfortable for you." : "Your browser could not save settings. Changes still work for this session."}</p>
  </div>;
}
