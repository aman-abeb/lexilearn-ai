import { createHash, timingSafeEqual } from "node:crypto";
import type { AccountRole } from "@/lib/contracts";

export type { AccountRole };

export const ENV_ADMIN_ID = "env-admin";

export function adminEmails(source = process.env.ADMIN_EMAILS): string[] {
  const listed = (source ?? "").split(",").map((email) => email.trim().toLowerCase()).filter((email) => email.includes("@"));
  const primary = process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? "";
  const withPrimary = source === process.env.ADMIN_EMAILS && primary.includes("@") ? [primary, ...listed] : listed;
  return [...new Set(withPrimary)];
}

export function isAdminEmail(email: string, source = process.env.ADMIN_EMAILS): boolean {
  return adminEmails(source).includes(email.trim().toLowerCase());
}

export function storedAccountRole(email: string, role: unknown, source = process.env.ADMIN_EMAILS): AccountRole {
  if (isAdminEmail(email, source)) return "admin";
  return role === "admin" ? "admin" : "student";
}

/** The first account becomes an admin. Later accounts stay students unless their email is listed. */
export function roleAfterSignIn(input: {
  email: string;
  current: AccountRole | null;
  otherAdmins: number;
}, source = process.env.ADMIN_EMAILS): AccountRole {
  if (isAdminEmail(input.email, source)) return "admin";
  if (input.current === "admin") return "admin";
  if (input.otherAdmins === 0) return "admin";
  return "student";
}

export function roleChangeBlock(input: {
  targetEmail: string;
  targetRole: AccountRole;
  nextRole: AccountRole;
  adminCount: number;
}, source = process.env.ADMIN_EMAILS): string | null {
  if (input.nextRole === input.targetRole) return null;
  if (input.nextRole === "student" && isAdminEmail(input.targetEmail, source)) {
    return "That email is listed in ADMIN_EMAILS, so this account stays an admin.";
  }
  if (input.nextRole === "student" && input.adminCount <= 1) return "Keep at least one admin.";
  return null;
}

export function deleteAccountBlock(input: {
  actorId: string;
  targetId: string;
  targetRole: AccountRole;
  adminCount: number;
}): string | null {
  if (input.actorId === input.targetId) return "Sign out to leave your own account. An admin can't remove themselves here.";
  if (input.targetRole === "admin" && input.adminCount <= 1) return "Keep at least one admin.";
  return null;
}

export function adminLoginConfigured(email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD): boolean {
  return Boolean(email?.trim().includes("@") && (password ?? "").length >= 12);
}

/** Compare the submitted admin login with the server env without leaking which field was wrong. */
export function adminCredentialsMatch(
  input: { email: string; password: string },
  expected: { email?: string; password?: string } = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD },
): boolean {
  if (!adminLoginConfigured(expected.email, expected.password)) return false;
  const email = createHash("sha256").update(input.email.trim().toLowerCase()).digest();
  const expectedEmail = createHash("sha256").update(expected.email!.trim().toLowerCase()).digest();
  const password = createHash("sha256").update(input.password).digest();
  const expectedPassword = createHash("sha256").update(expected.password!).digest();
  return timingSafeEqual(email, expectedEmail) && timingSafeEqual(password, expectedPassword);
}

export function revokeSessionBlock(actorId: string, targetId: string): string | null {
  if (actorId === targetId) return "Use Sign out to end your own session.";
  return null;
}
