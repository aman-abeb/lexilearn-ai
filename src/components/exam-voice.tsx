"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { StudyChatMessage, StudyChatResponse } from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { Icon } from "./icon";
import { useReadingPreferences } from "./reading-preferences-provider";

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechRecognition(): SpeechRecognitionLike | null {
  const Speech = (window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition
    ?? (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
  return Speech ? new Speech() : null;
}

export function ExamVoice({
  materialId, sectionId, prompt, aiAvailable,
}: {
  materialId: string;
  sectionId: string;
  prompt: string;
  aiAvailable: boolean;
}) {
  const id = useId();
  const { preferences } = useReadingPreferences();
  const [messages, setMessages] = useState<StudyChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const spoken = useRef<SpeechSynthesisUtterance | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const history = useRef<StudyChatMessage[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    setSpeechSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSpeakReplies(false);
    return () => {
      recognition.current?.stop();
      if (spoken.current && "speechSynthesis" in window) {
        spoken.current.onend = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function cancelSpeech() {
    if (spoken.current) { spoken.current.onend = null; spoken.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  function speak(text: string) {
    if (!speakReplies || !("speechSynthesis" in window)) return;
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en";
    utterance.rate = preferences.speechRate;
    spoken.current = utterance;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }

  async function send(text = draft) {
    const answer = text.trim();
    if (!answer || busy.current) return;
    recognition.current?.stop();
    setListening(false);
    busy.current = true;
    const next: StudyChatMessage[] = [...history.current, { role: "user" as const, text: answer }].slice(-12);
    history.current = next;
    setMessages(next); setDraft(""); setPending(true); setError(""); setWarnings([]);
    cancelSpeech();
    requestAnimationFrame(() => thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" }));
    try {
      const response = await apiRequest<StudyChatResponse>(`/api/materials/${encodeURIComponent(materialId)}/exam-oral`, {
        method: "POST",
        body: JSON.stringify({ sectionId, prompt, messages: next }),
      });
      const withReply = [...next, { role: "assistant" as const, text: response.reply.text }];
      history.current = withReply;
      setMessages(withReply);
      setWarnings(response.reply.warnings);
      speak(response.reply.text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The oral practice could not continue. Please try again.");
    } finally { busy.current = false; setPending(false); }
  }

  function toggleListening() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const engine = speechRecognition();
    if (!engine) { setError("Voice input is not supported by this browser. You can type your answer instead."); return; }
    cancelSpeech();
    recognition.current = engine;
    engine.lang = "en";
    engine.interimResults = true;
    engine.continuous = false;
    engine.onresult = event => {
      const results = Array.from(event.results) as Array<{ 0?: { transcript: string }; isFinal?: boolean }>;
      const transcript = results.map(result => result[0]?.transcript ?? "").join(" ").trim();
      setDraft(transcript);
      if (results.at(-1)?.isFinal && transcript) {
        engine.stop();
        setListening(false);
        void send(transcript);
      }
    };
    engine.onerror = event => {
      setListening(false);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        setError("The microphone could not be used. You can type your answer instead.");
      }
    };
    engine.onend = () => setListening(false);
    try {
      setError("");
      engine.start();
      setListening(true);
    } catch {
      setListening(false);
      setError("The microphone could not start. You can type your answer instead.");
    }
  }

  return <div className="exam-voice">
    <p>Answer aloud. The coach listens, then speaks a short reply from this section. You can type if you prefer.</p>
    {!aiAvailable && <p className="field-help">Study help is not connected yet. You can still read the question and compare it with the notes.</p>}
    <div className="conversation-thread" ref={thread} aria-live="polite">
      {messages.length === 0
        ? <p className="field-help">Press Speak and explain this idea in your own words.</p>
        : messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-bubble chat-${message.role}`}>
            <span>{message.role === "user" ? "You" : "Oral coach"}</span>
            <p>{message.text}</p>
          </div>
        ))}
    </div>
    {(listening || pending) && <p className="notice" role="status" aria-busy="true">{listening ? "Listening…" : "Preparing a spoken reply…"}</p>}
    {error && <p className="error-panel" role="alert">{error}</p>}
    <form className="conversation-form" onSubmit={event => { event.preventDefault(); void send(); }}>
      <label className="field-label" htmlFor={`${id}-answer`}>Your spoken answer</label>
      <textarea id={`${id}-answer`} className="text-area conversation-input" rows={3} value={draft} maxLength={2000} disabled={pending} onChange={event => setDraft(event.target.value)} placeholder="Your answer appears here as you speak…" />
      <div className="conversation-actions">
        <div className="control-group">
          <button type="button" className="button button-secondary" disabled={!aiAvailable || !speechSupported || pending} aria-pressed={listening} onClick={toggleListening}>
            <Icon name={listening ? "stop" : "mic"} size={18} />{listening ? "Stop listening" : "Speak"}
          </button>
          <button type="submit" className="button button-primary" disabled={!aiAvailable || pending || !draft.trim()}>Send</button>
          {messages.length > 0 && <button type="button" className="button button-ghost button-small" onClick={() => { history.current = []; setMessages([]); setWarnings([]); setDraft(""); cancelSpeech(); }}>Clear conversation</button>}
        </div>
        <label className="checkbox-control">
          <input type="checkbox" checked={speakReplies} onChange={event => { setSpeakReplies(event.target.checked); if (!event.target.checked) cancelSpeech(); }} />
          <span>Speak replies aloud</span>
        </label>
      </div>
    </form>
    {warnings.length > 0 && <div className="section-help-warnings"><p>Check this</p><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
    <p className="field-help">{speechSupported ? "Speaking uses your browser’s voice service. Chrome may send microphone audio to its speech service. The reply uses the configured AI and this section of the lecture." : "This browser cannot capture speech. Type your answer instead."}</p>
  </div>;
}
