"use client";

import { useState, useId, type CSSProperties, type FormEvent } from "react";
import type { ReadingPreferences } from "@/lib/contracts";
import { safePreferences } from "@/lib/preferences";
import { useAuth } from "./auth-provider";
import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";

const PAGE_COLOURS = [
  { theme: "paper", label: "Warm" },
  { theme: "white", label: "White" },
  { theme: "yellow", label: "Yellow" },
  { theme: "blue", label: "Blue" },
  { theme: "night", label: "Dark" },
] as const;

export function readingStyle(preferences: ReadingPreferences): CSSProperties {
  return {
    "--reading-size": `${preferences.fontSize}px`,
    "--reading-line": preferences.lineHeight,
    "--reading-spacing": `${preferences.letterSpacing}em`,
    "--reading-words": `${preferences.wordSpacing}em`,
    "--reading-paragraph": `${preferences.paragraphSpacing}em`,
    "--reading-weight": preferences.fontWeight === "bold" ? "700" : "400",
    "--reading-measure": preferences.readingWidth === "narrow" ? "46ch" : preferences.readingWidth === "wide" ? "76ch" : "62ch",
    "--reading-font": preferences.fontFamily === "serif"
      ? "Georgia, 'Times New Roman', serif"
      : preferences.fontFamily === "clear"
        ? "Verdana, Tahoma, sans-serif"
        : "Arial, Helvetica, sans-serif",
  } as CSSProperties;
}

export function PreferenceControls({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const {
    preferences, arrangements, activeArrangementId, updatePreferences, resetPreferences,
    saveArrangement, applyArrangement, updateActiveArrangement, deleteArrangement, storageAvailable, ready,
  } = useReadingPreferences();
  const { user, syncError } = useAuth();
  const [arrangementName, setArrangementName] = useState("");
  const [arrangementMessage, setArrangementMessage] = useState<string | null>(null);
  const active = arrangements.find(item => item.id === activeArrangementId) ?? null;
  const activeMatches = active ? JSON.stringify(safePreferences(active.preferences)) === JSON.stringify(safePreferences(preferences)) : false;

  function onSaveArrangement(event: FormEvent) {
    event.preventDefault();
    const message = saveArrangement(arrangementName);
    setArrangementMessage(message);
    if (!message) setArrangementName("");
  }

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
    <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-words`}>Word spacing <span>{preferences.wordSpacing.toFixed(2)} em</span></label>
      <input id={`${id}-words`} type="range" min="0" max="0.35" step="0.01" value={preferences.wordSpacing} disabled={!ready} onChange={event => updatePreferences({ wordSpacing: Number(event.target.value) })} />
      <div className="range-labels" aria-hidden="true"><span>Together</span><span>Apart</span></div>
    </div>
    <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-paragraphs`}>Paragraph spacing <span>{preferences.paragraphSpacing.toFixed(1)} em</span></label>
      <input id={`${id}-paragraphs`} type="range" min="0.4" max="2" step="0.1" value={preferences.paragraphSpacing} disabled={!ready} onChange={event => updatePreferences({ paragraphSpacing: Number(event.target.value) })} />
    </div>
    <fieldset className="preference-control"><legend className="field-label">Typeface</legend>
      <div className="segmented-control">
        <button type="button" aria-pressed={preferences.fontFamily === "sans"} disabled={!ready} onClick={() => updatePreferences({ fontFamily: "sans" })}>Sans</button>
        <button type="button" aria-pressed={preferences.fontFamily === "serif"} disabled={!ready} onClick={() => updatePreferences({ fontFamily: "serif" })}>Serif</button>
        <button type="button" aria-pressed={preferences.fontFamily === "clear"} disabled={!ready} onClick={() => updatePreferences({ fontFamily: "clear" })} title="Verdana">Clear</button>
      </div>
      {!compact && <p className="field-help">Clear uses Verdana, a simple sans serif. It is one option to try.</p>}
    </fieldset>
    <label className="checkbox-control"><input type="checkbox" checked={preferences.fontWeight === "bold"} disabled={!ready} onChange={event => updatePreferences({ fontWeight: event.target.checked ? "bold" : "regular" })} /><span><strong>Heavier letters</strong><small>A stronger stroke can make letter shapes easier to tell apart.</small></span></label>
    <fieldset className="preference-control"><legend className="field-label">Appearance</legend>
      <div className="segmented-control"><button type="button" aria-label="Light" title="Light" aria-pressed={preferences.appearance === "light"} disabled={!ready} onClick={() => updatePreferences({ appearance: "light" })}><Icon name="sun" size={18} /></button><button type="button" aria-label="Dark" title="Dark" aria-pressed={preferences.appearance === "dark"} disabled={!ready} onClick={() => updatePreferences({ appearance: "dark" })}><Icon name="moon" size={18} /></button></div>
    </fieldset>
    <fieldset className="preference-control"><legend className="field-label">Page colour</legend>
      <div className="segmented-control">{PAGE_COLOURS.map(({ theme, label }) => <button type="button" key={theme} aria-label={label} title={label} aria-pressed={preferences.theme === theme} disabled={!ready} onClick={() => updatePreferences({ theme })}><span className={`color-swatch color-swatch-${theme}`} /></button>)}</div>
    </fieldset>
    <fieldset className="preference-control"><legend className="field-label">Line length</legend>
      <div className="segmented-control">
        <button type="button" aria-pressed={preferences.readingWidth === "narrow"} disabled={!ready} onClick={() => updatePreferences({ readingWidth: "narrow" })}>Short</button>
        <button type="button" aria-pressed={preferences.readingWidth === "medium"} disabled={!ready} onClick={() => updatePreferences({ readingWidth: "medium" })}>Medium</button>
        <button type="button" aria-pressed={preferences.readingWidth === "wide"} disabled={!ready} onClick={() => updatePreferences({ readingWidth: "wide" })}>Long</button>
      </div>
      {!compact && <p className="field-help">Shorter lines can make it easier to keep your place. Longer lines show more of the paragraph at once.</p>}
    </fieldset>
    <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-speech`}>Read-aloud speed</label>
      <select id={`${id}-speech`} className="text-input" disabled={!ready} value={preferences.speechRate} onChange={event => updatePreferences({ speechRate: Number(event.target.value) })}>
        <option value={0.75}>0.75×</option>
        <option value={0.9}>0.9×</option>
        <option value={1}>1×</option>
        <option value={1.25}>1.25×</option>
      </select>
      {!compact && <p className="field-help">Used when a passage is read aloud. You can still change it next to the play button.</p>}
    </div>
    {!compact && <div className="preference-control"><label className="checkbox-control"><input type="checkbox" checked={preferences.sentenceGuide} disabled={!ready} onChange={event => updatePreferences({ sentenceGuide: event.target.checked })} /><span><strong>Sentence guide</strong><small>Read one sentence at a time within a section. Turn it off to see the full paragraph.</small></span></label></div>}
    <div className="preference-control"><label className="checkbox-control"><input type="checkbox" checked={preferences.readingGuide} disabled={!ready} onChange={event => updatePreferences({ readingGuide: event.target.checked })} /><span><strong>Reading guide</strong><small>Dim the other paragraphs while you point at one, or move to it with the keyboard.</small></span></label></div>
    {!compact && <label className="checkbox-control"><input type="checkbox" checked={preferences.focusMode} disabled={!ready} onChange={event => updatePreferences({ focusMode: event.target.checked })} /><span><strong>Focus view</strong><small>Hide the navigation while reading. Use Exit focus to bring it back.</small></span></label>}
    {compact && arrangements.length > 0 && <div className="preference-control">
      <label className="field-label" htmlFor={`${id}-arrangement`}>Arrangement</label>
      <select id={`${id}-arrangement`} className="text-input" value={activeArrangementId ?? ""} disabled={!ready} onChange={event => { if (event.target.value) applyArrangement(event.target.value); }}>
        <option value="">Current settings</option>
        {arrangements.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </div>}
    {!compact && <fieldset className="preference-control arrangement-panel"><legend className="field-label">Saved arrangements</legend>
      <p className="field-help">Save the current setup under a name, then switch between them. A roomy evening page and a compact daytime page can both stay.</p>
      <form className="arrangement-form" onSubmit={onSaveArrangement}>
        <label className="sr-only" htmlFor={`${id}-arrangement-name`}>Arrangement name</label>
        <input id={`${id}-arrangement-name`} className="text-input" value={arrangementName} maxLength={40} disabled={!ready} placeholder="Evening roomy" onChange={event => setArrangementName(event.target.value)} />
        <button type="submit" className="button button-secondary button-small" disabled={!ready}>Save arrangement</button>
      </form>
      {arrangementMessage && <p className="field-help" role="status">{arrangementMessage}</p>}
      {arrangements.length > 0 && <ul className="arrangement-list">
        {arrangements.map(item => <li key={item.id} className="arrangement-row">
          <button type="button" className="button button-secondary button-small" aria-pressed={item.id === activeArrangementId} disabled={!ready} onClick={() => applyArrangement(item.id)}>{item.name}</button>
          <button type="button" className="button button-ghost button-small" disabled={!ready} aria-label={`Remove ${item.name}`} onClick={() => deleteArrangement(item.id)}>Remove</button>
        </li>)}
      </ul>}
      {active && !activeMatches && <div className="arrangement-actions"><button type="button" className="button button-secondary button-small" disabled={!ready} onClick={updateActiveArrangement}>Update “{active.name}”</button></div>}
    </fieldset>}
    <button type="button" className="button button-ghost button-small" disabled={!ready} onClick={resetPreferences}>Reset reading settings</button>
    <p className="field-help">These options change how the text is presented. They are not a treatment, and one setup will not suit every reader.</p>
    <p className="field-help">{syncError ? syncError : storageAvailable ? (user ? "Settings and saved arrangements are stored with your account, so they can follow you on the web and in the mobile app." : "Settings and saved arrangements stay in this browser. Sign in to keep them with your Google account.") : "Your browser could not save settings. Changes still work for this session."}</p>
  </div>;
}
