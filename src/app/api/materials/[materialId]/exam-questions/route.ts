import { z } from "zod";
import { examPracticeProvider } from "@/server/ai/exam-practice";
import { apiError, handleApiError, jsonNoStore, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  try {
    const { prompt } = await readJson(request, z.object({ prompt: z.string().trim().max(1000).default("") }).strict());
    const { materialId } = await params;
    const material = await materialStore.find(materialId);
    if (!material) return apiError(404, "MATERIAL_NOT_FOUND", "This lecture could not be found.");
    return jsonNoStore(await examPracticeProvider.generate(material, prompt));
  } catch (error) { return handleApiError(error); }
}
