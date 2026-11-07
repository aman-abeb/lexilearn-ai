import type { MaterialResponse } from "@/lib/contracts";
import { sourceInputSchema } from "@/lib/validation";
import { handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string; sourceId: string }> }) {
  try {
    const { materialId, sourceId } = await params;
    const input = await readJson(request, sourceInputSchema, 600_000);
    return Response.json({ material: await materialStore.updateSource(materialId, sourceId, input) } satisfies MaterialResponse);
  } catch (error) { return handleApiError(error); }
}
