import { revokeSession } from "@/server/account-store";
import { readSessionToken, sessionCookie, verifySession } from "@/server/auth/session";
import { handleApiError, HttpError, jsonNoStore } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const token = readSessionToken(request);
    if (token) {
      try {
        const claims = await verifySession(token);
        await revokeSession(claims.sub, claims.sv);
      } catch (error) {
        if (error instanceof HttpError && error.code === "AUTH_NOT_CONFIGURED") throw error;
      }
    }
    return jsonNoStore({ ok: true }, { cookie: sessionCookie(null) });
  } catch (error) {
    return handleApiError(error);
  }
}
