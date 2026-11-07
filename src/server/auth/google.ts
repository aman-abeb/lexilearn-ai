import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { HttpError } from "../http";

const GOOGLE_CERTS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleIdentity = {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
};

export function googleClientIds(
  web = process.env.GOOGLE_CLIENT_ID,
  mobile = process.env.GOOGLE_MOBILE_CLIENT_IDS,
): string[] {
  return [...new Set([web, ...(mobile ?? "").split(",")].map((id) => id?.trim()).filter((id): id is string => Boolean(id)))];
}

export function googleProfilePicture(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const googleHost = host === "googleusercontent.com" || host.endsWith(".googleusercontent.com");
    if (url.protocol !== "https:" || !googleHost) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function accountFromGoogleClaims(payload: JWTPayload): GoogleIdentity {
  const verified = payload.email_verified === true || payload.email_verified === "true";
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
  if (!verified || !email.includes("@") || email.length > 320 || sub.length < 1 || sub.length > 255) {
    throw new HttpError(401, "GOOGLE_SIGN_IN_FAILED", "Use a verified Google account to sign in.");
  }
  const rawName = typeof payload.name === "string" ? payload.name.replace(/\s+/g, " ").trim() : "";
  const name = (rawName || email.split("@")[0] || "Student").slice(0, 120);
  return { sub, email, name, picture: googleProfilePicture(payload.picture) };
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const audiences = googleClientIds();
  if (audiences.length === 0) {
    throw new HttpError(503, "AUTH_NOT_CONFIGURED", "Add GOOGLE_CLIENT_ID before using Google sign-in.");
  }
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_CERTS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: audiences,
    });
    return accountFromGoogleClaims(payload);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "GOOGLE_SIGN_IN_FAILED", "Google could not confirm this sign-in. Please try again.");
  }
}
