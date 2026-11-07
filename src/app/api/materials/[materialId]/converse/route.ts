import type { StudyChatResponse } from "@/lib/contracts";
import { studyChatSchema } from "@/lib/validation";
import { studyProvider } from "@/server/ai/study";
import { apiError, handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const input = await readJson(request, studyChatSchema, 32_000);
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    const reply = await studyProvider.converse(material, input.messages);
    return Response.json({ reply } satisfies StudyChatResponse);
  } catch (error) { return handleApiError(error); }
}
