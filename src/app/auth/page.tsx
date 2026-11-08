import { AuthSignInCard } from "@/components/auth-sign-in-card";
import { safeNextPath } from "@/server/auth/access";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const params = await searchParams;
  const requested = Array.isArray(params.next) ? params.next[0] : params.next;
  const publicClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const serverClientId = (process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID)?.trim() ?? "";
  return <AuthSignInCard nextPath={safeNextPath(requested)} setup={{
    googleReady: Boolean(publicClientId && serverClientId),
    mongoReady: Boolean(process.env.MONGODB_URI?.trim()),
    secretReady: (process.env.AUTH_SECRET ?? "").length >= 32,
    clientIdsDiffer: Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && publicClientId && process.env.GOOGLE_CLIENT_ID.trim() !== publicClientId),
  }} />;
}
