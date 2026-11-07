import { preferenceSyncBody, safePreferences } from "@/lib/preferences";
import { preferenceSetupSchema } from "@/lib/validation";
import { requireAccount, savePreferences } from "@/server/account-store";
import { handleApiError, jsonNoStore, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await requireAccount(request);
    return jsonNoStore({
      preferences: account.preferences,
      arrangements: account.arrangements,
      activeArrangementId: account.activeArrangementId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const account = await requireAccount(request);
    const input = await readJson(request, preferenceSetupSchema);
    const body = preferenceSyncBody(input, input.arrangements, input.activeArrangementId);
    await savePreferences(account.user.id, account.sessionVersion, body);
    return jsonNoStore({
      preferences: safePreferences(body),
      arrangements: body.arrangements,
      activeArrangementId: body.activeArrangementId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
