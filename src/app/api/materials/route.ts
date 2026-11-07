import type { MaterialListResponse, MaterialResponse } from "@/lib/contracts";
import { z } from "zod";
import { createLectureSchema, createMaterialSchema } from "@/lib/validation";
import { handleApiError, readJson } from "@/server/http";
import { createMaterial } from "@/server/materials";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ materials: await materialStore.list() } satisfies MaterialListResponse);
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const input = await readJson(request, z.union([createLectureSchema, createMaterialSchema]), 1_000_000);
    const material = "courseId" in input ? await materialStore.createLecture(input) : await materialStore.add(createMaterial(input));
    return Response.json({ material } satisfies MaterialResponse, {
      status: 201,
      headers: { Location: `/api/materials/${material.id}` },
    });
  } catch (error) { return handleApiError(error); }
}
