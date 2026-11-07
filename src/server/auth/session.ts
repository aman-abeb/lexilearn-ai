import { SignJWT, jwtVerify } from "jose";
import { HttpError } from "../http";

const COOKIE = "lexilearn_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type SessionClaims = { sub: string; sv: number };

function authSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) {
    throw new HttpError(503, "AUTH_NOT_CONFIGURED", "Add AUTH_SECRET with at least 32 characters before signing in.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ sv: claims.sv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime("30d")
    .setIssuer("lexilearn")
    .setAudience("lexilearn-account")
    .sign(authSecret());
}

export async function verifySession(token: string): Promise<SessionClaims> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), {
      issuer: "lexilearn",
      audience: "lexilearn-account",
    });
    if (!payload.sub || typeof payload.sv !== "number" || !Number.isInteger(payload.sv)) {
      throw new Error("invalid session");
    }
    return { sub: payload.sub, sv: payload.sv };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "UNAUTHORIZED", "Your sign-in expired. Please sign in again.");
  }
}

/** Mobile clients send Authorization. The web app sends the httpOnly cookie. */
export function readSessionToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization !== null) {
    const match = /^Bearer\s+(\S+)$/.exec(authorization.trim());
    if (!match) throw new HttpError(401, "UNAUTHORIZED", "Sign in to save changes to your account.");
    return match[1];
  }
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) {
      try { return decodeURIComponent(rest.join("=")); }
      catch { return null; }
    }
  }
  return null;
}

export function wantsMobileToken(request: Request): boolean {
  return request.headers.get("x-lexilearn-client") === "mobile";
}

export function sessionCookie(token: string | null): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  if (!token) return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}
