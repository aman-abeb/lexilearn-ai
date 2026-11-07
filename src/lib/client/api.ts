import type { ApiError } from "@/lib/contracts";

export async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as ApiError | null;
    throw new Error(error?.error?.message ?? "We could not complete that request. Please try again.");
  }
  return body as T;
}
