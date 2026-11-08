import { setDefaultResultOrder } from "node:dns";

// api.x.ai publishes IPv6 addresses that refuse connections on this network.
// A request that starts there fails in a few milliseconds, before a problem can be written.
setDefaultResultOrder("ipv4first");

type LanguageModelConfig = { apiKey?: string; model?: string; baseUrl?: string };

/** Study tools use Grok when XAI_API_KEY is set. Otherwise they use the OpenAI-compatible settings. */
export function languageModelConfig(): LanguageModelConfig {
  const xaiKey = process.env.XAI_API_KEY?.trim();
  if (xaiKey) {
    return {
      apiKey: xaiKey,
      model: process.env.XAI_MODEL?.trim() || "grok-4.7",
      baseUrl: process.env.XAI_BASE_URL?.trim() || "https://api.x.ai/v1",
    };
  }
  return {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    baseUrl: process.env.OPENAI_BASE_URL,
  };
}

/** Grok reasoning models stay inside the request timeout when effort is low. */
export function languageModelExtras(baseUrl?: string): { reasoning_effort?: "low" } {
  try {
    const host = new URL(baseUrl || "https://api.openai.com/v1").host;
    if (host === "api.x.ai" || host.endsWith(".api.x.ai")) return { reasoning_effort: "low" };
  } catch { /* An unusable base URL falls back to the provider default. */ }
  return {};
}
