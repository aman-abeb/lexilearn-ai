import type { LectureAnalysisResponse } from "@/lib/contracts";
import { emptyBodySchema } from "@/lib/validation";
import { studyProvider } from "@/server/ai/study";
import { apiError, handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    await readJson(request, emptyBodySchema);
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    const analysis = await studyProvider.analyze(material);
    return Response.json({ analysis } satisfies LectureAnalysisResponse);
  } catch (error) { return handleApiError(error); }
}
