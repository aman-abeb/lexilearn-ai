"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { audioChunks, SPEECH_RATES } from "@/lib/client/speech";
import { LEXI_VOICE } from "@/lib/speech";
import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";

type Playback = "idle" | "loading" | "speaking" | "paused";

export function ReadAloud({ text, label }: { text: string; label: string }) {
  const id = useId();
  const { preferences, updatePreferences, ready } = useReadingPreferences();
  const [playback, setPlayback] = useState<Playback>("idle");
  const [error, setError] = useState("");
  const voice = LEXI_VOICE;
  const audio = useRef<HTMLAudioElement | null>(null);
  const request = useRef<AbortController | null>(null);
  const session = useRef(0);
  const urls = useRef(new Set<string>());
  const rate = useRef(preferences.speechRate);
  const chunks = useMemo(() => audioChunks(text), [text]);

  function cancel() {
    session.current++;
    request.current?.abort(); request.current = null;
    if (audio.current) {
      audio.current.onended = null; audio.current.onerror = null;
      audio.current.pause(); audio.current.removeAttribute("src"); audio.current.load();
      audio.current = null;
    }
    for (const url of urls.current) URL.revokeObjectURL(url);
    urls.current.clear();
  }

  useEffect(() => {
    setPlayback("idle"); setError("");
    return cancel;
  }, [text, voice]);

  useEffect(() => {
    rate.current = preferences.speechRate;
    if (audio.current) audio.current.playbackRate = preferences.speechRate;
  }, [preferences.speechRate]);

  async function start() {
    if (!ready || !chunks.length) return;
    cancel(); setError(""); setPlayback("loading");
    const current = session.current;
    const controller = new AbortController(); request.current = controller;
    const player = new Audio(); audio.current = player;
    player.preservesPitch = true;
    const cache = new Map<number, Promise<string>>();
    const active = () => session.current === current && !controller.signal.aborted;

    function fail(cause: unknown) {
      if (!active()) return;
      cancel(); setPlayback("idle");
      setError(cause instanceof Error ? cause.message : "The audio could not play. Please try again.");
    }

    function load(index: number): Promise<string> {
      const saved = cache.get(index);
      if (saved) return saved;
      const pending = (async () => {
        const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ input: chunks[index], voice }) });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error?.message ?? "The audio could not be generated. Please try again.");
        }
        const blob = await response.blob();
        if (!active()) throw new DOMException("Playback cancelled", "AbortError");
        if (!blob.size) throw new Error("Lexi returned empty audio. Please try again.");
        const url = URL.createObjectURL(blob); urls.current.add(url);
        return url;
      })();
      cache.set(index, pending);
      return pending;
    }

    async function play(index: number) {
      try {
        setPlayback("loading");
        const url = await load(index);
        if (!active()) return;
        player.src = url; player.playbackRate = rate.current;
        player.onended = () => {
          if (!active()) return;
          URL.revokeObjectURL(url); urls.current.delete(url); cache.delete(index);
          if (index + 1 < chunks.length) void play(index + 1);
          else { cancel(); setPlayback("idle"); }
        };
        player.onerror = () => fail(new Error("This audio could not play. Please try reading the passage again."));
        try {
          await player.play();
          if (active()) setPlayback("speaking");
        } catch (cause) {
          if (active() && cause instanceof DOMException && cause.name === "NotAllowedError") {
            setPlayback("paused"); setError("Your audio is ready. Press Resume reading to play it.");
          } else throw cause;
        }
        // Keep just the current and next passages in memory; Stop aborts both.
        if (active() && index + 1 < chunks.length) void load(index + 1).catch(() => undefined);
      } catch (cause) { fail(cause); }
    }

    void play(0);
  }

  async function togglePause() {
    const player = audio.current;
    if (!player) return;
    if (playback === "paused") {
      const current = session.current;
      try { await player.play(); if (session.current === current) { setPlayback("speaking"); setError(""); } }
      catch { if (session.current === current) setError("The audio could not resume. Press Resume reading to try again."); }
    } else { player.pause(); setPlayback("paused"); }
  }

  return <section className="audio-panel" aria-label="Read aloud controls" aria-busy={playback === "loading"}>
    <div className="reader-toolbar">
      <div className="control-group">
        {playback === "idle" ? <button type="button" className="button button-secondary button-small" disabled={!ready || !chunks.length} onClick={() => void start()}><Icon name="volume" size={18} />{label}</button> : <>
          {playback !== "loading" && <button type="button" className="button button-secondary button-small" onClick={() => void togglePause()}>{playback === "paused" ? "Resume reading" : "Pause reading"}</button>}
          <button type="button" className="button button-ghost button-small" onClick={() => { cancel(); setPlayback("idle"); setError(""); }}><Icon name="stop" size={18} />{playback === "loading" ? "Cancel audio" : "Stop reading"}</button>
        </>}
      </div>
      <p className="audio-speed">Voice: Lexi</p>
      <div className="audio-speed"><label htmlFor={`${id}-speed`}>Speed</label>
        <select id={`${id}-speed`} className="text-input" disabled={!ready} value={preferences.speechRate} onChange={event => updatePreferences({ speechRate: Number(event.target.value) })}>
          {!SPEECH_RATES.some(value => value === preferences.speechRate) && <option value={preferences.speechRate}>{preferences.speechRate}×</option>}
          {SPEECH_RATES.map(value => <option key={value} value={value}>{value}×</option>)}
        </select>
      </div>
    </div>
    <p className="field-help" role="status">{playback === "loading" ? "Lexi is preparing the audio…" : playback === "paused" ? "Reading paused. Resume when you are ready." : playback === "speaking" ? "Lexi is reading aloud. You can change speed while listening." : "Lexi reads with Grok. Timestamps, filler sounds, and stutters are skipped."}</p>
    {error && <p className="notice" role="status">{error}</p>}
  </section>;
}
