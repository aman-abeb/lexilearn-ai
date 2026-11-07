import type { PracticeHintResponse } from "@/lib/contracts";
import { practiceHintSchema } from "@/lib/validation";
import { studyProvider } from "@/server/ai/study";
import { apiError, handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const input = await readJson(request, practiceHintSchema);
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    const hint = await studyProvider.hintPractice(material.id, input.problemId);
    return Response.json(hint satisfies PracticeHintResponse);
  } catch (error) { return handleApiError(error); }
}
