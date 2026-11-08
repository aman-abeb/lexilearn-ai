import { adaptationProvider } from "@/server/ai/provider";
import { mongoConfigured } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const accountsConfigured = Boolean(mongoConfigured() && (process.env.AUTH_SECRET?.length ?? 0) >= 32 && process.env.GOOGLE_CLIENT_ID);
  return Response.json({ status: "ok", service: "lexilearn", aiConfigured: adaptationProvider.configured, accountsConfigured, databaseConfigured: mongoConfigured() });
}
