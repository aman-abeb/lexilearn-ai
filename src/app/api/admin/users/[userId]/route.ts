import { adminRoleSchema } from "@/lib/validation";
import { deleteUser, requireAdmin, setUserRole } from "@/server/account-store";
import { checkOrigin, handleApiError, HttpError, jsonNoStore, readJson } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function userId(value: string): string {
  const id = decodeURIComponent(value).trim();
  if (id.length < 1 || id.length > 255 || id.includes("/") || id.includes("\\")) {
    throw new HttpError(400, "VALIDATION_ERROR", "That account could not be found.");
  }
  return id;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const id = userId((await params).userId);
    const input = await readJson(request, adminRoleSchema);
    const user = await setUserRole(admin.user.id, id, input.role);
    return jsonNoStore({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    checkOrigin(request);
    const admin = await requireAdmin(request);
    await deleteUser(admin.user.id, userId((await params).userId));
    return jsonNoStore({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
