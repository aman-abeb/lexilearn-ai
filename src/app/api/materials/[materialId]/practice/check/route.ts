import type { PracticeCheckResponse } from "@/lib/contracts";
import { practiceCheckSchema } from "@/lib/validation";
import { studyProvider } from "@/server/ai/study";
import { apiError, handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const input = await readJson(request, practiceCheckSchema);
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    const result = await studyProvider.checkPractice(material, input.problemId, input.answer);
    return Response.json({ result } satisfies PracticeCheckResponse);
  } catch (error) { return handleApiError(error); }
}
