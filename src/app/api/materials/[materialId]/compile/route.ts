import { z } from "zod";
import type { MaterialResponse } from "@/lib/contracts";
import { compilationProvider } from "@/server/ai/compilation";
import { apiError, handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const maxDuration = 120;
const active = new Set<string>();

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  let activeId: string | undefined;
  try {
    await readJson(request, z.object({}).strict());
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    if (active.has(materialId)) return apiError(409, "COMPILATION_IN_PROGRESS", "This lecture is already being compiled. Open it again in a moment.");
    active.add(materialId); activeId = materialId;
    const compilation = await compilationProvider.compile(material);
    return Response.json({ material: await materialStore.saveCompilation(materialId, compilation) } satisfies MaterialResponse);
  } catch (error) { return handleApiError(error); }
  finally { if (activeId) active.delete(activeId); }
}
