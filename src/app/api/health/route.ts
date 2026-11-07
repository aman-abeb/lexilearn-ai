import { adaptationProvider } from "@/server/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const accountsConfigured = Boolean(process.env.MONGODB_URI && (process.env.AUTH_SECRET?.length ?? 0) >= 32 && process.env.GOOGLE_CLIENT_ID);
  return Response.json({ status: "ok", service: "lexilearn", aiConfigured: adaptationProvider.configured, accountsConfigured });
}
