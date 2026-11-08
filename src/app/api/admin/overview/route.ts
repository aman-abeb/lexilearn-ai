import { listManagedUsers, requireAdmin } from "@/server/account-store";
import { handleApiError, jsonNoStore } from "@/server/http";
import { materialStore } from "@/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const [users, courses, materials] = await Promise.all([
      listManagedUsers(),
      materialStore.listCourses(),
      materialStore.list(),
    ]);
    return jsonNoStore({
      users,
      counts: {
        users: users.length,
        admins: users.filter((user) => user.role === "admin").length,
        courses: courses.length,
        lectures: materials.length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
