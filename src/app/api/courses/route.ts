import type { CourseListResponse, CourseResponse } from "@/lib/contracts";
import { createCourseSchema } from "@/lib/validation";
import { compilationProvider } from "@/server/ai/compilation";
import { handleApiError, readJson } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json({ courses: await materialStore.listCourses(), compilationAvailable: compilationProvider.configured } satisfies CourseListResponse);
  } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const input = await readJson(request, createCourseSchema);
    return Response.json({ course: await materialStore.createCourse(input) } satisfies CourseResponse, { status: 201 });
  } catch (error) { return handleApiError(error); }
}
