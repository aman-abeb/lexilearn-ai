import {
  fetchTranscript, listLanguages, toVTT,
  YoutubeTranscriptDisabledError, YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError, YoutubeTranscriptTooManyRequestError,
  YoutubeTranscriptVideoUnavailableError,
  type FetchParams, type TranscriptConfig, type TranscriptSegment,
} from "youtube-transcript-plus";
import type { CaptionLanguage, YouTubeImportResponse } from "../../lib/contracts";
import { MAX_SOURCE_CHARACTERS } from "../../lib/validation";
import { parseYouTubeUrl } from "../../lib/youtube";
import { cleanTranscript } from "../../lib/transcript";
import { HttpError } from "../http";

const UPSTREAM_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "video.google.com"]);
const UPSTREAM_PATHS = new Set(["/watch", "/youtubei/v1/player", "/api/timedtext", "/timedtext"]);
type ImportOptions = { signal?: AbortSignal; fetch?: typeof fetch };
type CachedResponse = { bytes: Uint8Array; status: number; headers: Headers };

function assertUpstreamUrl(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.port || url.username || url.password || !UPSTREAM_HOSTS.has(url.hostname) || !UPSTREAM_PATHS.has(url.pathname)) {
    throw new HttpError(502, "YOUTUBE_INVALID_RESPONSE", "YouTube returned an unsupported caption location. Try another video or import a transcript file.");
  }
  return url;
}

async function boundedResponse(response: Response, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "YOUTUBE_RESPONSE_TOO_LARGE", "This video returned too much caption data. Import a shorter transcript file instead.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

function decodeCaptionText(text: string): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  let decoded = text;
  for (let pass = 0; pass < 2; pass++) {
    decoded = decoded.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code: string) => {
      if (!code.startsWith("#")) return entities[code.toLowerCase()] ?? entity;
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isInteger(point) && point > 0 && point <= 0x10ffff && !(point >= 0xd800 && point <= 0xdfff) ? String.fromCodePoint(point) : entity;
    });
  }
  return decoded.replace(/<\/?(?:i|b|u|c|v|lang)(?:[ .][^>]*)?>/gi, "").replace(/\s+/g, " ").trim();
}

/** Clean reading text; the VTT download retains the original words and timing. */
export function formatYouTubeCaptions(cues: TranscriptSegment[]): { text: string; captionsVtt: string; cueCount: number } {
  if (!cues.length || cues.some(cue => typeof cue.text !== "string" || !Number.isFinite(cue.offset) || !Number.isFinite(cue.duration) || cue.offset < 0 || cue.duration < 0)) {
    throw new HttpError(502, "YOUTUBE_INVALID_CAPTIONS", "YouTube returned unreadable captions. Retry or import a transcript file.");
  }
  const segments = cues.map(cue => ({ ...cue, text: decodeCaptionText(cue.text) })).filter(cue => cue.text).sort((a, b) => a.offset - b.offset);
  const paragraphs: string[] = [];
  let start = 0;
  let words: string[] = [];
  let length = 0;
  for (const cue of segments) {
    if (words.length && (cue.offset - start >= 30 || length + cue.text.length > 600)) {
      paragraphs.push(words.join(" ")); words = []; length = 0;
    }
    if (!words.length) start = cue.offset;
    words.push(cue.text); length += cue.text.length + 1;
  }
  if (words.length) paragraphs.push(words.join(" "));
  const text = cleanTranscript(paragraphs.join("\n\n"));
  if (text.length < 10) throw new HttpError(422, "YOUTUBE_NO_CAPTIONS", "This video has too little readable caption text. Add another source or import a transcript.");
  if (text.length > MAX_SOURCE_CHARACTERS) throw new HttpError(413, "YOUTUBE_TRANSCRIPT_TOO_LONG", "This transcript exceeds 100,000 characters. Import a shorter lecture segment instead.");
  const escaped = segments.map(cue => ({ ...cue, text: cue.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;") }));
  return { text, captionsVtt: toVTT(escaped), cueCount: segments.length };
}

export async function importYouTubeCaptions(value: string, options: ImportOptions = {}): Promise<YouTubeImportResponse> {
  const video = parseYouTubeUrl(value);
  if (!video) throw new HttpError(400, "INVALID_YOUTUBE_URL", "Paste a link to a single YouTube video.");
  const timeout = AbortSignal.timeout(25_000);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  // Listing languages and fetching a chosen track share watch/player responses.
  // This is request-local: a language change never downloads the watch page twice.
  const cache = new Map<string, CachedResponse>();
  const networkFetch = async (params: FetchParams): Promise<Response> => {
    const key = `${params.method ?? "GET"}:${params.url}:${params.body ?? ""}`;
    const cached = cache.get(key);
    if (cached) return new Response(cached.bytes.length ? Buffer.from(cached.bytes) : null, { status: cached.status, headers: cached.headers });
    let url = assertUpstreamUrl(params.url);
    let response: Response | undefined;
    for (let redirect = 0; redirect <= 3; redirect++) {
      response = await (options.fetch ?? fetch)(url, {
        method: params.method ?? "GET", body: params.body, redirect: "manual", signal,
        headers: { "User-Agent": params.userAgent ?? "LexiLearn", "Accept-Language": "en", ...params.headers },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirect === 3) throw new HttpError(502, "YOUTUBE_UNAVAILABLE", "YouTube could not provide captions right now. Please try again.");
      url = assertUpstreamUrl(new URL(location, url).toString());
    }
    if (!response) throw new Error("Missing YouTube response");
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 429) throw new HttpError(429, "YOUTUBE_RATE_LIMITED", "YouTube is limiting caption requests. Please try again later, or upload a transcript file.");
      throw new HttpError(response.status >= 500 ? 503 : 422, "YOUTUBE_UNAVAILABLE", "This video or its captions could not be accessed. Check the link or import a transcript file.");
    }
    const limit = url.pathname === "/watch" ? 4_000_000 : url.pathname === "/youtubei/v1/player" ? 3_000_000 : 1_500_000;
    const bytes = await boundedResponse(response, limit);
    const body = new TextDecoder().decode(bytes);
    if (/confirm you[’']?re not a bot|class="g-recaptcha"/i.test(body)) throw new HttpError(503, "YOUTUBE_BLOCKED", "YouTube is blocking caption retrieval from this server. Try again later or upload the video’s transcript.");
    const item = { bytes, status: response.status, headers: response.headers };
    cache.set(key, item);
    return new Response(bytes.length ? Buffer.from(bytes) : null, { status: item.status, headers: item.headers });
  };
  const config: TranscriptConfig = { signal, videoFetch: networkFetch, playerFetch: networkFetch, transcriptFetch: networkFetch };
  try {
    const tracks = await listLanguages(video.videoId, config);
    const languages: CaptionLanguage[] = tracks.map(track => ({ code: track.languageCode, name: track.languageName || track.languageCode, automatic: track.isAutoGenerated }));
    const selected = languages.find(track => track.code === "en" && !track.automatic) ?? languages.find(track => track.code.startsWith("en")) ?? languages.find(track => !track.automatic) ?? languages[0];
    if (!selected) throw new HttpError(422, "YOUTUBE_NO_CAPTIONS", "No accessible captions were found for this video. Upload or paste a transcript instead.");
    const result = await fetchTranscript(video.videoId, { ...config, lang: selected.code, videoDetails: true });
    const formatted = formatYouTubeCaptions(result.segments);
    const languageName = selected.name.slice(0, 100);
    return {
      source: {
        kind: "recording", name: (result.videoDetails.title.trim() || `YouTube video ${video.videoId}`).slice(0, 200), url: video.url, text: formatted.text,
        warnings: selected.automatic ? [`${languageName} captions were automatically generated by YouTube. Check names, technical terms, and equations against the video.`] : [],
        transcript: { platform: "youtube", videoId: video.videoId, language: selected.code, languageName, automatic: selected.automatic, retrievedAt: new Date().toISOString() },
      },
      captionsVtt: formatted.captionsVtt, cueCount: formatted.cueCount,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (timeout.aborted) throw new HttpError(504, "YOUTUBE_TIMEOUT", "Caption retrieval took too long. Please try again or import a transcript file.");
    if (options.signal?.aborted) throw new HttpError(408, "YOUTUBE_CANCELLED", "Caption import was cancelled.");
    if (error instanceof YoutubeTranscriptTooManyRequestError) throw new HttpError(429, "YOUTUBE_RATE_LIMITED", "YouTube is limiting caption requests. Try again later or upload a transcript file.");
    if (error instanceof YoutubeTranscriptVideoUnavailableError) throw new HttpError(422, "YOUTUBE_UNAVAILABLE", "This video is unavailable or requires sign-in. Try a public video or import its transcript file.");
    if (error instanceof YoutubeTranscriptDisabledError || error instanceof YoutubeTranscriptNotAvailableError) throw new HttpError(422, "YOUTUBE_NO_CAPTIONS", "No accessible captions were found for this video. You can upload or paste a transcript, try another video, or save the link for later.");
    if (error instanceof YoutubeTranscriptNotAvailableLanguageError) throw new HttpError(422, "YOUTUBE_NO_CAPTIONS", "The caption track is no longer available. Retry or import a transcript file.");
    throw new HttpError(503, "YOUTUBE_UNAVAILABLE", "YouTube captions could not be retrieved right now. Please retry or import a transcript file.");
  }
}
