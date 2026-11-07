import { getAccount } from "@/server/account-store";
import { readSessionToken, sessionCookie, verifySession } from "@/server/auth/session";
import { handleApiError, HttpError, jsonNoStore } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = readSessionToken(request);
    if (!token) return jsonNoStore({ user: null });
    try {
      const claims = await verifySession(token);
      const account = await getAccount(claims.sub);
      if (!account || account.sessionVersion !== claims.sv) {
        return jsonNoStore({ user: null }, { cookie: sessionCookie(null) });
      }
      return jsonNoStore({
        user: account.user,
        preferences: account.preferences,
        arrangements: account.arrangements,
        activeArrangementId: account.activeArrangementId,
        progress: account.progress,
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        return jsonNoStore({ user: null }, { cookie: sessionCookie(null) });
      }
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
