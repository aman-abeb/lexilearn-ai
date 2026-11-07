import assert from "node:assert/strict";
import test from "node:test";
import { cleanTranscript } from "../src/lib/transcript";
import { audioChunks, speechChunks, SPEECH_RATES } from "../src/lib/client/speech";
import { MAX_SPEECH_CHARACTERS, OPENAI_VOICES } from "../src/lib/speech";
import { createSpeechProvider, speechInputSchema } from "../src/server/ai/speech";
import { HttpError } from "../src/server/http";
import { DEFAULT_READING_PREFERENCES } from "../src/lib/contracts";
import { preferenceSyncBody, safePreferences } from "../src/lib/preferences";
import { preferenceSetupSchema } from "../src/lib/validation";
import { formatYouTubeCaptions } from "../src/server/ingestion/youtube";

test("the reported transcript loses timestamps, fillers, and transcribed stutters", () => {
  const original = "[00:06:52.200] uh, you know, um, and- and I hope that after this class, you'll be able to build meaningful machine learning applications, uh, either in an academic setting or after you graduate. Um, oh, one exciting thing is education.";
  const cleaned = cleanTranscript(original);
  assert.equal(cleaned, "and I hope that after this class, you'll be able to build meaningful machine learning applications, either in an academic setting or after you graduate. one exciting thing is education.");
  assert.equal(cleanTranscript(cleaned), cleaned);
  assert.equal(speechChunks(original).join(" "), cleaned);
});

test("cleanup preserves technical words, numbers, negation, and deliberate repetition", () => {
  const text = "The OH group, UM campus, human summary, and uh-oh example stay. Do you know the answer? Never remove not. A rate of 0.75 and x = y + 2 matter. She had had enough.";
  assert.equal(cleanTranscript(text), text);
  assert.equal(cleanTranscript("[06:52] Um, and- and- and education.\n\n00:07:00.100 Uh, law and engineering."), "and education.\n\nlaw and engineering.");
  assert.equal(cleanTranscript("Um, uh, oh,"), "");
});

test("YouTube reading text is cleaned while the VTT download retains source speech and timing", () => {
  const result = formatYouTubeCaptions([
    { offset: 412.2, duration: 2, text: "Uh, and-", lang: "en" },
    { offset: 414.2, duration: 3, text: "and education matters, um, for everyone.", lang: "en" },
  ]);
  assert.equal(result.text, "and education matters, for everyone.");
  assert.equal(result.cueCount, 2);
  assert.match(result.captionsVtt, /00:06:52\.200 --> 00:06:54\.200/);
  assert.match(result.captionsVtt, /Uh, and-/);
  assert.match(result.captionsVtt, /um, for everyone/);
  assert.throws(() => formatYouTubeCaptions([{ offset: 0, duration: 10, text: "um, uh, um, uh, um, uh", lang: "en" }]), /too little readable/);
});

test("long speech is split at sentences and words without dropping lecture content", () => {
  const text = "First sentence. " + "The value is 0.95 and must not change; ".repeat(60) + "The conclusion remains.";
  const chunks = speechChunks(text);
  assert.ok(chunks.length > 5);
  assert.equal(chunks[0], "First sentence.");
  assert.ok(chunks.every(chunk => chunk.length <= 240));
  assert.equal(chunks.join(" "), text);
  assert.deepEqual(speechChunks("[00:06:52.200] Um, uh,"), []);
});

test("OpenAI passages preserve paragraphs and stay within the API input limit", () => {
  const paragraph = "A score of 0.95 must not be mistaken for certainty. ".repeat(170).trim();
  const chunks = audioChunks(`[00:06:52.200] Uh, ${paragraph}\n\nSecond paragraph.`);
  assert.ok(chunks.length > 2);
  assert.ok(chunks.every(chunk => chunk.length <= MAX_SPEECH_CHARACTERS));
  assert.equal(chunks.join(" "), `${paragraph}\n\nSecond paragraph.`);
  assert.deepEqual(audioChunks("Part 1\n\nA short explanation."), ["Part 1\n\nA short explanation."]);
  assert.deepEqual(audioChunks("[00:00:01] um, uh,"), []);
});

test("all seven playback speeds survive browser storage and account sync", () => {
  assert.deepEqual(SPEECH_RATES, [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  for (const speechRate of SPEECH_RATES) {
    const preferences = safePreferences({ speechRate });
    const body = preferenceSyncBody(preferences, [{ id: "saved", name: "Reading", preferences }], "saved");
    const synced = preferenceSetupSchema.parse(body);
    assert.equal(synced.speechRate, speechRate);
    assert.equal(synced.arrangements[0].preferences.speechRate, speechRate);
  }
  assert.equal(DEFAULT_READING_PREFERENCES.speechRate, 1);
  assert.equal(safePreferences({ speechRate: 0.9 }).speechRate, 0.9);
  assert.equal(safePreferences({ speechRate: 20 }).speechRate, 2);
  assert.equal(safePreferences({ speechRate: 0.1 }).speechRate, 0.5);
});

test("speech requests accept only bounded text and supported OpenAI voices", () => {
  assert.equal(speechInputSchema.parse({ input: "A lecture passage." }).voice, "marin");
  for (const voice of OPENAI_VOICES) assert.equal(speechInputSchema.safeParse({ input: "Read this.", voice }).success, true);
  for (const input of [
    { input: " " }, { input: "x".repeat(MAX_SPEECH_CHARACTERS + 1) },
    { input: "Read this.", voice: "untrusted-custom-voice" },
    { input: "Read this.", apiKey: "client-supplied-key" },
  ]) assert.equal(speechInputSchema.safeParse(input).success, false);
});

test("speech uses a server-only OpenAI key, cleans narration, and streams private MP3 audio", async () => {
  let sent: Record<string, unknown> = {};
  const provider = createSpeechProvider({ apiKey: "test-secret", fetch: async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/audio/speech");
    assert.equal(new Headers(options?.headers).get("authorization"), "Bearer test-secret");
    sent = JSON.parse(options?.body as string);
    return new Response(new Uint8Array([73, 68, 51, 1]), { headers: { "Content-Type": "audio/mpeg" } });
  } });
  const response = await provider.synthesize({ input: "[00:06:52.200] Uh, and- and education matters.", voice: "marin" });
  assert.equal(sent.model, "gpt-4o-mini-tts");
  assert.equal(sent.voice, "marin");
  assert.equal(sent.input, "and education matters.");
  assert.equal(sent.response_format, "mp3");
  assert.match(String(sent.instructions), /naturally/);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type"), "audio/mpeg");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([73, 68, 51, 1]));
});

test("speech handles missing keys, empty narration, provider limits, and invalid audio without exposing upstream data", async () => {
  const input = { input: "A lecture passage.", voice: "cedar" as const };
  await assert.rejects(createSpeechProvider({}).synthesize(input), (error: unknown) => error instanceof HttpError && error.code === "SPEECH_NOT_CONFIGURED");
  await assert.rejects(createSpeechProvider({ apiKey: "test" }).synthesize({ ...input, input: "[00:00:01] Um, uh," }), (error: unknown) => error instanceof HttpError && error.code === "EMPTY_SPEECH");
  for (const [status, expected] of [[429, "SPEECH_RATE_LIMITED"], [401, "SPEECH_UNAVAILABLE"], [500, "SPEECH_UNAVAILABLE"]] as const) {
    const provider = createSpeechProvider({ apiKey: "test-secret", fetch: async () => new Response("private provider details", { status }) });
    await assert.rejects(provider.synthesize(input), (error: unknown) => error instanceof HttpError && error.code === expected && !error.message.includes("private provider details"));
  }
  const invalid = createSpeechProvider({ apiKey: "test", fetch: async () => Response.json({ unexpected: true }) });
  await assert.rejects(invalid.synthesize(input), (error: unknown) => error instanceof HttpError && error.code === "INVALID_SPEECH");
  const controller = new AbortController(); controller.abort();
  const cancelled = createSpeechProvider({ apiKey: "test", fetch: async (_url, options) => {
    assert.equal(options?.signal?.aborted, true); throw new DOMException("aborted", "AbortError");
  } });
  await assert.rejects(cancelled.synthesize(input, controller.signal), (error: unknown) => error instanceof HttpError && error.code === "SPEECH_UNAVAILABLE");
});
