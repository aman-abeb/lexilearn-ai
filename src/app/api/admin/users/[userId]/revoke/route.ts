import { requireAdmin, revokeUserSessions } from "@/server/account-store";
import { checkOrigin, handleApiError, HttpError, jsonNoStore } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin(request);
    const id = decodeURIComponent((await params).userId).trim();
    if (id.length < 1 || id.length > 255 || id.includes("/") || id.includes("\\")) {
      throw new HttpError(400, "VALIDATION_ERROR", "That account could not be found.");
    }
    await revokeUserSessions(admin.user.id, id);
    return jsonNoStore({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
