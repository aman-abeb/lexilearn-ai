import type { AdaptationResponse } from "@/lib/contracts";
import { readingMaterial } from "@/lib/lecture";
import { adaptationSchema } from "@/lib/validation";
import { adaptationProvider } from "@/server/ai/provider";
import { apiError, handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const input = await readJson(request, adaptationSchema);
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This material could not be found.");
    const section = readingMaterial(material).sections.find((item) => item.id === input.sectionId);
    if (!section) return apiError(404, "SECTION_NOT_FOUND", "This source section could not be found.");
    const adaptation = await adaptationProvider.adapt({ material, section, mode: input.mode });
    return Response.json({ adaptation } satisfies AdaptationResponse);
  } catch (error) { return handleApiError(error); }
}
