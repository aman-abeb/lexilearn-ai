import { notesQuestionSchema } from "@/lib/validation";
import { examPracticeProvider } from "@/server/ai/exam-practice";
import { handleApiError, jsonNoStore, readJson } from "@/server/http";

export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(request: Request) {
  try {
    const { notes, prompt } = await readJson(request, notesQuestionSchema, 500_000);
    return jsonNoStore(await examPracticeProvider.generateFromNotes(notes, prompt));
  } catch (error) { return handleApiError(error); }
}
