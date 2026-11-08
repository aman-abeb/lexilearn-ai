import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { TranscriptSegment } from "youtube-transcript-plus";
import { parseYouTubeUrl } from "../src/lib/youtube";
import { sourceInputSchema, youtubeImportSchema } from "../src/lib/validation";
import { createCompilationProvider } from "../src/server/ai/compilation";
import { HttpError } from "../src/server/http";
import { formatYouTubeCaptions, importYouTubeCaptions } from "../src/server/ingestion/youtube";
import { MaterialStore } from "../src/server/store";

const VIDEO_ID = "aircAruvnKk";
const VIDEO_URL = `https://www.youtube.com/watch?v=${VIDEO_ID}`;
const xml = '<transcript><text start="1.25" dur="2.75">Digital identity &amp;amp; privacy.</text><text start="5" dur="3">Identification is not authentication.</text><text start="34" dur="4">Authorization determines what you can do.</text></transcript>';

function youtubeFixture(options: { captions?: boolean; captionUrl?: string; captionBody?: string; autoOnly?: boolean; status?: number } = {}) {
  const calls: string[] = [];
  const network: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    calls.push(url.pathname);
    if (options.status) return new Response("Unavailable", { status: options.status });
    if (url.pathname === "/watch") return new Response('<html><script>{"INNERTUBE_API_KEY":"test-player-key"}</script></html>');
    if (url.pathname === "/youtubei/v1/player") {
      assert.equal(JSON.parse(init?.body as string).videoId, VIDEO_ID);
      const tracks = options.captions === false ? [] : options.autoOnly ? [
        { languageCode: "it", name: { simpleText: "Italian (auto-generated)" }, kind: "asr", baseUrl: options.captionUrl ?? "https://www.youtube.com/api/timedtext?lang=it" },
      ] : [
        { languageCode: "fr", name: { simpleText: "French" }, baseUrl: "https://www.youtube.com/api/timedtext?lang=fr" },
        { languageCode: "en", name: { simpleText: "English" }, baseUrl: options.captionUrl ?? "https://www.youtube.com/api/timedtext?lang=en" },
        { languageCode: "it", name: { simpleText: "Italian (auto-generated)" }, kind: "asr", baseUrl: "https://www.youtube.com/api/timedtext?lang=it" },
      ];
      return Response.json({ playabilityStatus: { status: "OK" }, videoDetails: { videoId: VIDEO_ID, title: "Identity and privacy", author: "Example lecturer", lengthSeconds: "38" }, captions: { playerCaptionsTracklistRenderer: { captionTracks: tracks } } });
    }
    if (url.pathname === "/api/timedtext") return new Response(options.captionBody ?? xml);
    throw new Error(`Unexpected network destination: ${url.origin}${url.pathname}`);
  };
  return { calls, network };
}

test("YouTube video URL forms normalize to one video without accepting arbitrary hosts or playlists", () => {
  for (const value of [VIDEO_URL, `${VIDEO_URL}&t=20&list=course`, `https://youtu.be/${VIDEO_ID}?si=shared`, `https://m.youtube.com/watch?v=${VIDEO_ID}`, `https://www.youtube.com/shorts/${VIDEO_ID}`, `https://www.youtube.com/live/${VIDEO_ID}`, `https://www.youtube-nocookie.com/embed/${VIDEO_ID}`]) {
    assert.deepEqual(parseYouTubeUrl(value), { videoId: VIDEO_ID, url: VIDEO_URL });
    assert.equal(youtubeImportSchema.safeParse({ url: value }).success, true);
  }
  for (const value of ["https://youtube.com.evil.example/watch?v=aircAruvnKk", "https://www.youtube.com/playlist?list=course", "https://www.youtube.com/watch?v=short", `https://www.youtube.com/watch?v=${VIDEO_ID}&v=another0000`, `https://user:password@www.youtube.com/watch?v=${VIDEO_ID}`, `https://www.youtube.com:8443/watch?v=${VIDEO_ID}`, `http://www.youtube.com/watch?v=${VIDEO_ID}`, "http://127.0.0.1/internal", "https://elearning.unimib.it/mod/kalvidres/view.php?id=1706861"]) {
    assert.equal(parseYouTubeUrl(value), null);
    assert.equal(youtubeImportSchema.safeParse({ url: value }).success, false);
  }
});

test("available captions become clean lecture text and timed VTT with the selected language", async () => {
  const fixture = youtubeFixture();
  const result = await importYouTubeCaptions(`https://youtu.be/${VIDEO_ID}`, { fetch: fixture.network });
  assert.equal(result.source.name, "Identity and privacy");
  assert.equal(result.source.url, VIDEO_URL);
  assert.equal(result.source.text, "Digital identity & privacy. Identification is not authentication.\n\nAuthorization determines what you can do.");
  assert.equal(result.source.transcript?.language, "en");
  assert.equal(result.source.transcript?.automatic, false);
  assert.equal(result.cueCount, 3);
  assert.match(result.captionsVtt, /^WEBVTT\n/);
  assert.match(result.captionsVtt, /00:00:01\.250 --> 00:00:04\.000/);
  assert.match(result.captionsVtt, /Digital identity &amp; privacy/);
  assert.deepEqual(fixture.calls, ["/watch", "/youtubei/v1/player", "/api/timedtext"]);
  assert.equal(sourceInputSchema.safeParse(result.source).success, true);
});

test("automatic captions are used when published captions are unavailable and retain their provenance", async () => {
  const fallback = youtubeFixture({ autoOnly: true });
  const auto = await importYouTubeCaptions(VIDEO_URL, { fetch: fallback.network });
  assert.equal(auto.source.transcript?.language, "it");
  assert.equal(auto.source.transcript?.automatic, true);
  assert.ok(auto.source.warnings?.some(warning => warning.includes("automatically generated by YouTube")));
});

test("no captions, blocked requests, and empty caption responses fail without fabricating transcript text", async () => {
  for (const options of [{ captions: false }, { captionBody: "<transcript></transcript>" }]) {
    const fixture = youtubeFixture(options);
    await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: fixture.network }),
      (error: unknown) => error instanceof HttpError && error.status === 422 && error.code === "YOUTUBE_NO_CAPTIONS");
  }
  const limited = youtubeFixture({ status: 429 });
  await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: limited.network }),
    (error: unknown) => error instanceof HttpError && error.status === 429 && error.code === "YOUTUBE_RATE_LIMITED");
  const blocked = youtubeFixture({ status: 403 });
  await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: blocked.network }),
    (error: unknown) => error instanceof HttpError && error.status === 422);
});

test("caption destinations and redirects cannot make the importer fetch arbitrary URLs", async () => {
  const fixture = youtubeFixture({ captionUrl: "http://127.0.0.1/private" });
  await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: fixture.network }),
    (error: unknown) => error instanceof HttpError && error.code === "YOUTUBE_INVALID_RESPONSE");
  assert.deepEqual(fixture.calls, ["/watch", "/youtubei/v1/player"]);
  const calls: string[] = [];
  await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: async input => {
    calls.push(String(input));
    return new Response(null, { status: 302, headers: { Location: "http://127.0.0.1/private" } });
  } }), (error: unknown) => error instanceof HttpError && error.code === "YOUTUBE_INVALID_RESPONSE");
  assert.equal(calls.length, 1);
});

test("oversized and cancelled caption requests stop rather than saving partial content", async () => {
  await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: async () => new Response("x".repeat(4_000_001)) }),
    (error: unknown) => error instanceof HttpError && error.code === "YOUTUBE_RESPONSE_TOO_LARGE");
  const fixture = youtubeFixture();
  const controller = new AbortController(); controller.abort();
  await assert.rejects(importYouTubeCaptions(VIDEO_URL, { fetch: fixture.network, signal: controller.signal }),
    (error: unknown) => error instanceof HttpError && error.code === "YOUTUBE_CANCELLED");
  assert.equal(fixture.calls.length, 0);
  assert.throws(() => formatYouTubeCaptions([{ text: "Long lecture content. ".repeat(6000), offset: 0, duration: 100, lang: "en" }]),
    (error: unknown) => error instanceof HttpError && error.code === "YOUTUBE_TRANSCRIPT_TOO_LONG");
});

test("caption formatting preserves spoken repetitions, Unicode, and mathematical comparisons", () => {
  const cues: TranscriptSegment[] = [
    { text: "Very, very important: x &lt; y &amp;amp; y &gt; 0.", offset: 0, duration: 2, lang: "en" },
    { text: "It&amp;#39;s an &lt;i&gt;example&lt;/i&gt; — café.", offset: 2, duration: 3, lang: "en" },
    { text: "Review the definition.", offset: 3661.01, duration: 1, lang: "en" },
  ];
  const result = formatYouTubeCaptions(cues);
  assert.match(result.text, /Very, very important: x < y & y > 0/);
  assert.match(result.text, /It's an example — café/);
  assert.match(result.text, /\n\nReview the definition\./);
  assert.doesNotMatch(result.text, /\[01:01:01\.010\]/);
  assert.match(result.captionsVtt, /01:01:01\.010 --> 01:01:02\.010/);
  assert.equal(result.cueCount, 3);
});

test("imported YouTube captions survive source edits and feed the real compilation contract", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lexilearn-youtube-"));
  try {
    const fixture = youtubeFixture({ autoOnly: true });
    const imported = await importYouTubeCaptions(VIDEO_URL, { fetch: fixture.network });
    const path = join(directory, "materials.json");
    const store = new MaterialStore(path);
    const course = await store.createCourse({ name: "Digital identity" });
    const lecture = await store.createLecture({ title: "Digital identity", courseId: course.id, sources: [imported.source] });
    const restored = (await new MaterialStore(path).find(lecture.id))!;
    assert.deepEqual(restored.sources[0].transcript, imported.source.transcript);
    let prompt = "";
    const provider = createCompilationProvider({ apiKey: "test-only", fetch: async (_url, options) => {
      prompt = options?.body as string;
      return Response.json({ choices: [{ finish_reason: "stop", message: { content: JSON.stringify({
        overview: "Identification and authorization have distinct roles.", sections: [{ title: "Digital identity", text: "Identification is not authentication. Authorization determines what you can do.", sourceIds: [restored.sources[0].id] }], keyTerms: [], warnings: [],
      }) } }] });
    } });
    const compilation = await provider.compile(restored);
    assert.ok(prompt.includes("Identification is not authentication"));
    assert.ok(prompt.includes('\\"platform\\":\\"youtube\\"'));
    assert.ok(compilation.warnings.some(warning => warning.includes("automatically generated")));
    await store.saveCompilation(lecture.id, compilation);
    const updated = await store.updateSource(lecture.id, restored.sources[0].id, { ...imported.source, text: imported.source.text + "\n\nA personal correction.", transcript: { ...imported.source.transcript!, edited: true } });
    assert.equal(updated.sources[0].transcript?.edited, true);
    assert.equal((await new MaterialStore(path).find(lecture.id))?.sources[0].transcript?.videoId, VIDEO_ID);
    const mismatched = { ...imported.source, url: "https://youtu.be/jNQXAC9IVRw" };
    assert.equal(sourceInputSchema.safeParse(mismatched).success, false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
