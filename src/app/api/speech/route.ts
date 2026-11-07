import { speechInputSchema, speechProvider } from "@/server/ai/speech";
import { handleApiError, readJson } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(request: Request) {
  try {
    const input = await readJson(request, speechInputSchema, 24_000);
    return await speechProvider.synthesize(input, request.signal);
  } catch (error) { return handleApiError(error); }
}
