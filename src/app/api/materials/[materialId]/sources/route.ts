import type { MaterialResponse } from "@/lib/contracts";
import { addSourcesSchema } from "@/lib/validation";
import { handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const { materialId } = await params;
    const { sources } = await readJson(request, addSourcesSchema, 1_000_000);
    return Response.json({ material: await materialStore.addSources(materialId, sources) } satisfies MaterialResponse, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
