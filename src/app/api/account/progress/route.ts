import { jsonObjectSchema } from "@/lib/validation";
import { requireAccount, saveProgress } from "@/server/account-store";
import { handleApiError, HttpError, jsonNoStore, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    return jsonNoStore({ progress: account.progress });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const account = await requireAccount(request);
    const input = await readJson(request, jsonObjectSchema);
    try {
      const progress = await saveProgress(account.user.id, account.sessionVersion, input);
      return jsonNoStore({ progress });
    } catch (error) {
      if (error instanceof TypeError) throw new HttpError(400, "VALIDATION_ERROR", error.message);
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
