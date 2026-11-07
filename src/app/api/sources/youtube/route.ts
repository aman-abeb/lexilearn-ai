import { youtubeImportSchema } from "@/lib/validation";
import { handleApiError, readJson } from "@/server/http";
import { importYouTubeCaptions } from "@/server/ingestion/youtube";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(request: Request) {
  try {
    const { url } = await readJson(request, youtubeImportSchema, 8_000);
    return Response.json(await importYouTubeCaptions(url, { signal: request.signal }));
  } catch (error) { return handleApiError(error); }
}
