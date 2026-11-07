"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  LectureAnalysis, LectureAnalysisResponse, LectureSummary, LectureSummaryResponse,
  Material, StudyChatMessage, StudyChatResponse,
} from "@/lib/contracts";
import { apiRequest } from "@/lib/client/api";
import { Icon } from "./icon";
import { readingStyle } from "./preference-controls";
import { ReadAloud } from "./read-aloud";
import { useReadingPreferences } from "./reading-preferences-provider";

type Tool = "summary" | "analysis" | "voice";

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

function Warnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return <div className="section-help-warnings"><p>Check this</p><ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>;
}

export function StudyCompanion({ material, aiAvailable }: { material: Material; aiAvailable: boolean }) {
  const id = useId();
  const { preferences } = useReadingPreferences();
  const [tool, setTool] = useState<Tool>("summary");
  const [summary, setSummary] = useState<LectureSummary | null>(null);
  const [analysis, setAnalysis] = useState<LectureAnalysis | null>(null);
  const [messages, setMessages] = useState<StudyChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Tool | null>(null);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [replyWarnings, setReplyWarnings] = useState<string[]>([]);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const spoken = useRef<(() => void) | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const history = useRef<StudyChatMessage[]>([]);
  const busy = useRef(false);

  useEffect(() => {
    setSpeechSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSpeakReplies(false);
    return () => {
      recognition.current?.stop();
      spoken.current?.();
    };
  }, []);

  useEffect(() => {
    setSummary(null); setAnalysis(null); setMessages([]); history.current = []; setReplyWarnings([]); setError("");
  }, [material.id, material.compilation?.generatedAt]);

  function cancelSpeech() {
    spoken.current?.();
    spoken.current = null;
  }

  function speak(text: string) {
    if (!speakReplies) return;
    cancelSpeech();
    const controller = new AbortController();
    let url = "";
    let audio: HTMLAudioElement | null = null;
    spoken.current = () => {
      controller.abort();
      if (audio) { audio.onended = null; audio.pause(); audio.removeAttribute("src"); audio.load(); }
      if (url) URL.revokeObjectURL(url);
    };
    void (async () => {
      try {
        const response = await fetch("/api/speech", {
          method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
          body: JSON.stringify({ input: text, voice: "lexi" }),
        });
        if (!response.ok || controller.signal.aborted) return;
        const blob = await response.blob();
        if (!blob.size || controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        audio = new Audio(url);
        audio.preservesPitch = true;
        audio.playbackRate = preferences.speechRate;
        audio.onended = () => { if (url) URL.revokeObjectURL(url); spoken.current = null; };
        await audio.play();
      } catch { /* The written reply stays on the page when Lexi cannot speak. */ }
    })();
  }

  async function loadSummary() {
    setPending("summary"); setError("");
    try {
      const response = await apiRequest<LectureSummaryResponse>(`/api/materials/${material.id}/summarize`, { method: "POST", body: "{}" });
      setSummary(response.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The summary could not finish. The lecture is still here.");
    } finally { setPending(null); }
  }

  async function loadAnalysis() {
    setPending("analysis"); setError("");
    try {
      const response = await apiRequest<LectureAnalysisResponse>(`/api/materials/${material.id}/analyze`, { method: "POST", body: "{}" });
      setAnalysis(response.analysis);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The analysis could not finish. The lecture is still here.");
    } finally { setPending(null); }
  }

  async function send(text = draft) {
    const question = text.trim();
    if (!question || busy.current) return;
    busy.current = true;
    const next: StudyChatMessage[] = [...history.current, { role: "user" as const, text: question }].slice(-12);
    history.current = next;
    setMessages(next); setDraft(""); setPending("voice"); setError(""); setReplyWarnings([]);
    cancelSpeech();
    requestAnimationFrame(() => thread.current?.scrollTo({ top: thread.current.scrollHeight, behavior: "smooth" }));
    try {
      const response = await apiRequest<StudyChatResponse>(`/api/materials/${material.id}/converse`, {
        method: "POST", body: JSON.stringify({ messages: next }),
      });
      const withReply = [...next, { role: "assistant" as const, text: response.reply.text }];
      history.current = withReply;
      setMessages(withReply);
      setReplyWarnings(response.reply.warnings);
      speak(response.reply.text);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The conversation could not finish. Please try again.");
    } finally { busy.current = false; setPending(null); }
  }

  function toggleListening() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const engine = speechRecognition();
    if (!engine) { setError("Voice input is not supported by this browser. You can type a question instead."); return; }
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
        setError("The microphone could not be used. You can type your question instead.");
      }
    };
    engine.onend = () => setListening(false);
    try {
      setError("");
      engine.start();
      setListening(true);
    } catch {
      setListening(false);
      setError("The microphone could not start. You can type your question instead.");
    }
  }

  return <section className="study-companion" aria-labelledby={`${id}-heading`}>
    <header className="section-heading">
      <div>
        <h2 id={`${id}-heading`}>Study with AI</h2>
        <p className="page-subtitle">Ask for a short recap, a closer look at how the ideas connect, or talk through the lecture. The original notes stay in Study notes.</p>
      </div>
    </header>
    <div className="view-switch" role="group" aria-label="Ways to study this lecture">
      <button type="button" aria-pressed={tool === "summary"} onClick={() => { setTool("summary"); setError(""); }}><Icon name="list" size={17} />Summary</button>
      <button type="button" aria-pressed={tool === "analysis"} onClick={() => { setTool("analysis"); setError(""); }}><Icon name="sparkles" size={17} />Analysis</button>
      <button type="button" aria-pressed={tool === "voice"} onClick={() => { setTool("voice"); setError(""); }}><Icon name="chat" size={17} />Conversation</button>
    </div>
    {!aiAvailable && <p className="field-help">Study help is not connected yet. You can keep reading the lecture.</p>}
    {pending && <p className="notice" role="status" aria-busy="true">{pending === "summary" ? "Preparing a short recap…" : pending === "analysis" ? "Looking at how the ideas connect…" : listening ? "Listening…" : "Preparing a reply…"} The lecture stays available.</p>}
    {error && <p className="error-panel" role="alert">{error}</p>}

    {tool === "summary" && <div className="study-tool">
      <p>A short recap of this lecture, in plain sentences you can listen to.</p>
      <button type="button" className="button button-primary" disabled={!aiAvailable || pending !== null} onClick={() => void loadSummary()}>
        <Icon name="sparkles" size={18} />{summary ? "Refresh summary" : "Summarize this lecture"}
      </button>
      {summary && <div className={`section-help-result theme-${preferences.theme}`} style={readingStyle(preferences)}>
        <p className="reader-source-label">Generated summary</p>
        <h3 className="reader-text">{summary.headline}</h3>
        <ul className="takeaway-list">{summary.takeaways.map(item => <li key={item} className="reader-text">{item}</li>)}</ul>
        <p className="reader-text">{summary.inOneMinute}</p>
        <Warnings warnings={summary.warnings} />
        <ReadAloud text={`${summary.headline}\n\n${summary.takeaways.join("\n")}\n\n${summary.inOneMinute}`} label="Read this summary aloud" />
      </div>}
    </div>}

    {tool === "analysis" && <div className="study-tool">
      <p>How the main ideas fit together, what is easy to mix up, and a calm order to review.</p>
      <button type="button" className="button button-primary" disabled={!aiAvailable || pending !== null} onClick={() => void loadAnalysis()}>
        <Icon name="sparkles" size={18} />{analysis ? "Refresh analysis" : "Analyse this lecture"}
      </button>
      {analysis && <div className={`section-help-result theme-${preferences.theme}`} style={readingStyle(preferences)}>
        <p className="reader-source-label">Generated analysis</p>
        {analysis.mainIdeas.map(idea => <section key={idea.title} className="analysis-block"><h3>{idea.title}</h3><p className="reader-text">{idea.explanation}</p></section>)}
        {analysis.confusionPoints.length > 0 && <section className="analysis-block"><h3>Easy to mix up</h3><ul className="takeaway-list">{analysis.confusionPoints.map(item => <li key={item.point} className="reader-text"><strong>{item.point}.</strong> {item.why}</li>)}</ul></section>}
        {analysis.connections.length > 0 && <section className="analysis-block"><h3>How the ideas connect</h3><ul className="takeaway-list">{analysis.connections.map(item => <li key={item} className="reader-text">{item}</li>)}</ul></section>}
        <section className="analysis-block"><h3>A short review plan</h3><ol className="takeaway-list">{analysis.reviewPlan.map(item => <li key={item} className="reader-text">{item}</li>)}</ol></section>
        <Warnings warnings={analysis.warnings} />
        <ReadAloud text={[...analysis.mainIdeas.map(idea => `${idea.title}. ${idea.explanation}`), ...analysis.reviewPlan].join("\n\n")} label="Read this analysis aloud" />
      </div>}
    </div>}

    {tool === "voice" && <div className="study-tool">
      <p>Ask a question by voice or by typing. Replies stay as text, and can be spoken aloud.</p>
      <div className="conversation-thread" ref={thread} aria-live="polite">
        {messages.length === 0 ? <p className="field-help">Try “What is this lecture really about?” or “Explain overfitting in simpler words.”</p> : messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-bubble chat-${message.role}`}>
            <span>{message.role === "user" ? "You" : "Lexi"}</span>
            <p>{message.text}</p>
          </div>
        ))}
      </div>
      <form className="conversation-form" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label className="field-label" htmlFor={`${id}-question`}>Your question</label>
        <textarea id={`${id}-question`} className="text-area conversation-input" rows={3} value={draft} maxLength={2000} disabled={pending !== null} onChange={event => setDraft(event.target.value)} placeholder="Ask about this lecture…" />
        <div className="conversation-actions">
          <div className="control-group">
            <button type="button" className="button button-secondary" disabled={!aiAvailable || !speechSupported || pending !== null} aria-pressed={listening} onClick={toggleListening}>
              <Icon name={listening ? "stop" : "mic"} size={18} />{listening ? "Stop listening" : "Speak"}
            </button>
            <button type="submit" className="button button-primary" disabled={!aiAvailable || pending !== null || !draft.trim()}>Send</button>
            {messages.length > 0 && <button type="button" className="button button-ghost button-small" onClick={() => { history.current = []; setMessages([]); setReplyWarnings([]); cancelSpeech(); }}>Clear conversation</button>}
          </div>
          <label className="checkbox-control">
            <input type="checkbox" checked={speakReplies} onChange={event => { setSpeakReplies(event.target.checked); if (!event.target.checked) cancelSpeech(); }} />
            <span>Speak replies aloud</span>
          </label>
        </div>
      </form>
      {replyWarnings.length > 0 && <Warnings warnings={replyWarnings} />}
      <p className="field-help">{speechSupported ? "The microphone uses your browser’s speech service. Chrome may send that audio to its speech service. Lexi speaks replies with Grok." : "This browser cannot capture speech. Type your question instead. Lexi can still speak the reply."}</p>
    </div>}
  </section>;
}
