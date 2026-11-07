import { z } from "zod";
import { MAX_SPEECH_CHARACTERS, OPENAI_VOICES } from "../../lib/speech";
import { cleanTranscript } from "../../lib/transcript";
import { HttpError } from "../http";

export const speechInputSchema = z.object({
  input: z.string().trim().min(1, "Choose some text to read aloud.").max(MAX_SPEECH_CHARACTERS),
  voice: z.enum(OPENAI_VOICES).default("marin"),
}).strict();

type Configuration = { apiKey?: string; model?: string; baseUrl?: string; fetch?: typeof fetch };

export function createSpeechProvider(configuration: Configuration) {
  return {
    async synthesize(input: z.infer<typeof speechInputSchema>, signal?: AbortSignal): Promise<Response> {
      if (!configuration.apiKey) throw new HttpError(503, "SPEECH_NOT_CONFIGURED", "OpenAI speech needs OPENAI_API_KEY in the server’s .env file.");
      const text = cleanTranscript(input.input);
      if (!text) throw new HttpError(400, "EMPTY_SPEECH", "This passage has no spoken words after removing timestamps and filler sounds.");
      let response: Response;
      try {
        response = await (configuration.fetch ?? fetch)(`${(configuration.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "")}/audio/speech`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
          signal: AbortSignal.any([AbortSignal.timeout(60_000), ...(signal ? [signal] : [])]),
          body: JSON.stringify({
            model: configuration.model || "gpt-4o-mini-tts",
            voice: input.voice, input: text, response_format: "mp3",
            instructions: "Read the supplied lecture text exactly as written, in its original language. Sound like a warm, engaging university tutor speaking naturally to one student. Use a conversational tone, smooth phrasing, varied intonation, and brief pauses at sentence and paragraph boundaries. Gently emphasize important definitions and contrasts. Pronounce academic terms clearly. Use a comfortable normal pace. Do not add introductions, explanations, filler words, or commentary.",
          }),
        });
      } catch {
        throw new HttpError(504, "SPEECH_UNAVAILABLE", "OpenAI could not finish generating the audio. Please try again.");
      }
      if (response.status === 429) throw new HttpError(429, "SPEECH_RATE_LIMITED", "OpenAI speech is at its usage or rate limit. Check your API quota or try again shortly.");
      if (!response.ok) throw new HttpError(502, "SPEECH_UNAVAILABLE", "OpenAI could not generate the audio. Check the server’s API key and speech model, then try again.");
      if (!response.body || !/^(audio\/|application\/octet-stream)/i.test(response.headers.get("content-type") ?? "")) {
        throw new HttpError(502, "INVALID_SPEECH", "OpenAI returned an unexpected audio response. Please try again.");
      }
      return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    },
  };
}

export const speechProvider = createSpeechProvider({ apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_TTS_MODEL, baseUrl: process.env.OPENAI_TTS_BASE_URL });
