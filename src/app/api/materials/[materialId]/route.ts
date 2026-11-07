import type { MaterialResponse } from "@/lib/contracts";
import { apiError, handleApiError } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This material could not be found.");
    return Response.json({ material } satisfies MaterialResponse);
  } catch (error) { return handleApiError(error); }
}
