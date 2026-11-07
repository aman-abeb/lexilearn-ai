import { adaptationProvider } from "@/server/ai/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ status: "ok", service: "lexilearn", aiConfigured: adaptationProvider.configured });
}
