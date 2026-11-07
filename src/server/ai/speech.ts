import { z } from "zod";
import { GROK_VOICE_ID, LEXI_VOICE, MAX_SPEECH_CHARACTERS } from "../../lib/speech";
import { cleanTranscript } from "../../lib/transcript";
import { HttpError } from "../http";
import { languageModelConfig } from "./config";

export const speechInputSchema = z.object({
  input: z.string().trim().min(1, "Choose some text to read aloud.").max(MAX_SPEECH_CHARACTERS),
  voice: z.literal(LEXI_VOICE).default(LEXI_VOICE),
}).strict();

type Configuration = { apiKey?: string; baseUrl?: string; fetch?: typeof fetch };

export function createSpeechProvider(configuration: Configuration) {
  return {
    async synthesize(input: z.infer<typeof speechInputSchema>, signal?: AbortSignal): Promise<Response> {
      if (!configuration.apiKey) throw new HttpError(503, "SPEECH_NOT_CONFIGURED", "Lexi’s voice needs XAI_API_KEY in the server’s .env file.");
      const text = cleanTranscript(input.input);
      if (!text) throw new HttpError(400, "EMPTY_SPEECH", "This passage has no spoken words after removing timestamps and filler sounds.");
      let response: Response;
      try {
        response = await (configuration.fetch ?? fetch)(`${(configuration.baseUrl || "https://api.x.ai/v1").replace(/\/$/, "")}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuration.apiKey}` },
          signal: AbortSignal.any([AbortSignal.timeout(60_000), ...(signal ? [signal] : [])]),
          body: JSON.stringify({
            text, voice_id: GROK_VOICE_ID, language: "en",
            output_format: { codec: "mp3" },
          }),
        });
      } catch {
        throw new HttpError(504, "SPEECH_UNAVAILABLE", "Lexi could not finish generating the audio. Please try again.");
      }
      if (response.status === 429) throw new HttpError(429, "SPEECH_RATE_LIMITED", "Grok speech is at its usage or rate limit. Try again shortly.");
      if (response.status === 401) throw new HttpError(401, "AI_KEY_REJECTED", "Grok rejected the speech key. Check XAI_API_KEY, then restart the server.");
      if (!response.ok) throw new HttpError(502, "SPEECH_UNAVAILABLE", "Lexi could not generate the audio. Check the Grok key, then try again.");
      if (!response.body || !/^(audio\/|application\/octet-stream)/i.test(response.headers.get("content-type") ?? "")) {
        throw new HttpError(502, "INVALID_SPEECH", "Grok returned an unexpected audio response. Please try again.");
      }
      return new Response(response.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    },
  };
}

export const speechProvider = createSpeechProvider(languageModelConfig());
