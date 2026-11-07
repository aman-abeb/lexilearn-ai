import type { AccountUser, PreferenceArrangement, ReadingPreferences } from "@/lib/contracts";
import type { ReadingProgressStore } from "@/lib/client/reading-progress";
import { googleSignInSchema } from "@/lib/validation";
import { upsertGoogleUser } from "@/server/account-store";
import { verifyGoogleIdToken } from "@/server/auth/google";
import { sessionCookie, signSession, wantsMobileToken } from "@/server/auth/session";
import { handleApiError, jsonNoStore, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, googleSignInSchema);
    const identity = await verifyGoogleIdToken(input.idToken);
    const account = await upsertGoogleUser(identity);
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
    // The web app keeps the httpOnly cookie. Native apps ask for a bearer token.
    if (wantsMobileToken(request)) body.token = token;
    return jsonNoStore(body, { cookie: sessionCookie(token) });
  } catch (error) {
    return handleApiError(error);
  }
}
