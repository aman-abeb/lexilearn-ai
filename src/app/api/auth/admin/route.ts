import type { AccountUser, PreferenceArrangement, ReadingPreferences } from "@/lib/contracts";
import type { ReadingProgressStore } from "@/lib/client/reading-progress";
import { adminSignInSchema } from "@/lib/validation";
import { upsertGoogleUser } from "@/server/account-store";
import { adminCredentialsMatch, adminLoginConfigured, ENV_ADMIN_ID } from "@/server/auth/admin";
import { sessionCookie, signSession, wantsMobileToken } from "@/server/auth/session";
import { handleApiError, HttpError, jsonNoStore, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, adminSignInSchema);
    if (!adminLoginConfigured()) {
      throw new HttpError(503, "AUTH_NOT_CONFIGURED", "Add ADMIN_EMAIL and ADMIN_PASSWORD before using the admin sign-in.");
    }
    if (!adminCredentialsMatch(input)) {
      throw new HttpError(401, "ADMIN_SIGN_IN_FAILED", "That admin sign-in was not recognized.");
    }
    const email = process.env.ADMIN_EMAIL!.trim().toLowerCase();
    const account = await upsertGoogleUser({ sub: ENV_ADMIN_ID, email, name: "Admin", picture: null });
    const token = await signSession({ sub: account.user.id, sv: account.sessionVersion });
    const body: {
      user: AccountUser;
      preferences: ReadingPreferences;
      arrangements: PreferenceArrangement[];
      activeArrangementId: string | null;
      progress: ReadingProgressStore;
      created: boolean;
      token?: string;
    } = {
      user: account.user,
      preferences: account.preferences,
      arrangements: account.arrangements,
      activeArrangementId: account.activeArrangementId,
      progress: account.progress,
      created: account.created,
    };
    if (wantsMobileToken(request)) body.token = token;
    return jsonNoStore(body, { cookie: sessionCookie(token) });
  } catch (error) {
    return handleApiError(error);
  }
}
