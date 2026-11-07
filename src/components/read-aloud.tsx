"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";

export function ReadAloud({ text, label }: { text: string; label: string }) {
  const id = useId();
  const { preferences, updatePreferences, ready } = useReadingPreferences();
  const [available, setAvailable] = useState(false);
  const [playback, setPlayback] = useState<"idle" | "speaking" | "paused">("idle");
  const [error, setError] = useState("");
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  function cancelSpeech() {
    if (utterance.current) {
      utterance.current.onend = null;
      utterance.current.onerror = null;
      utterance.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  useEffect(() => { setAvailable("speechSynthesis" in window && "SpeechSynthesisUtterance" in window); }, []);
  useEffect(() => {
    setPlayback("idle"); setError("");
    return cancelSpeech;
  }, [text, preferences.speechRate]);

  function start() {
    if (!available) return;
    cancelSpeech(); setError("");
    const speech = new SpeechSynthesisUtterance(text);
    speech.lang = "en";
    speech.rate = preferences.speechRate;
    speech.onend = () => { utterance.current = null; setPlayback("idle"); };
    speech.onerror = event => {
      utterance.current = null; setPlayback("idle");
      if (event.error !== "canceled" && event.error !== "interrupted") setError("Read aloud is unavailable right now. You can continue using the text.");
    };
    utterance.current = speech;
    try {
      // Clear a paused engine left by a previous passage before starting again.
      window.speechSynthesis.resume();
      setPlayback("speaking");
      window.speechSynthesis.speak(speech);
    } catch {
      cancelSpeech(); setPlayback("idle");
      setError("Read aloud is unavailable right now. You can continue using the text.");
    }
  }

  function togglePause() {
    if (playback === "paused") { window.speechSynthesis.resume(); setPlayback("speaking"); }
    else { window.speechSynthesis.pause(); setPlayback("paused"); }
  }

  return <section className="audio-panel" aria-label="Read aloud controls">
    <div className="reader-toolbar">
      <div className="control-group">
        {playback === "idle" ? <button type="button" className="button button-secondary button-small" disabled={!available || !ready || !text} onClick={start}><Icon name="volume" size={18} />{label}</button> : <>
          <button type="button" className="button button-secondary button-small" onClick={togglePause}>{playback === "paused" ? "Resume reading" : "Pause reading"}</button>
          <button type="button" className="button button-ghost button-small" onClick={() => { cancelSpeech(); setPlayback("idle"); }}><Icon name="stop" size={18} />Stop reading</button>
        </>}
      </div>
      <div className="audio-speed"><label htmlFor={`${id}-speed`}>Speed</label>
        <select id={`${id}-speed`} className="text-input" disabled={!available || !ready || playback !== "idle"} value={preferences.speechRate} onChange={event => updatePreferences({ speechRate: Number(event.target.value) })}>
          <option value={0.75}>0.75×</option><option value={0.9}>0.9×</option><option value={1}>1×</option><option value={1.25}>1.25×</option>
        </select>
      </div>
    </div>
    <p className="field-help" role="status">{available ? playback === "paused" ? "Reading paused. Resume when you are ready." : playback === "speaking" ? "Reading aloud. Stop playback to change speed." : "Uses your browser’s voice service. Choose a pace that suits you." : "Read aloud is not supported by this browser."}</p>
    {error && <p className="notice" role="status">{error}</p>}
  </section>;
}
