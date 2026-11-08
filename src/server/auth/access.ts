/** Paths that stay available before a Google session exists. */
export function isPublicPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/auth" || pathname.startsWith("/auth/") || pathname === "/admin") return true;
  return pathname === "/api/health"
    || pathname === "/api/auth/google"
    || pathname === "/api/auth/admin"
    || pathname === "/api/auth/session"
    || pathname === "/api/auth/sign-out";
}

/** Only same-app paths can be used after sign-in. Anything else opens the dashboard. */
export function safeNextPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || value.startsWith("/auth")) return "/dashboard";
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) return "/dashboard";
  return value;
}
