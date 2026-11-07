import type { z } from "zod";
import type { ApiError } from "../lib/contracts";

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
  }
}

export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}

/** Bound the actual streamed body, including requests without Content-Length. */
export function checkOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  // NextURL normalizes loopback addresses to localhost. Compare with the actual
  // Host header so same-origin forms opened at 127.0.0.1 still work.
  const host = request.headers.get("host");
  if (host) requestUrl.host = host;
  if (origin && origin !== requestUrl.origin) {
    throw new HttpError(403, "ORIGIN_NOT_ALLOWED", "Use this application's own material form.");
  }
}

export async function readBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_BODY", "A request body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "BODY_TOO_LARGE", "This upload is too large. Use a smaller file or a shorter passage.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function readJson<T>(request: Request, schema: z.ZodType<T>, maxBytes = 256_000): Promise<T> {
  checkOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_CONTENT_TYPE", "Send this request as JSON.");
  }
  const bytes = await readBody(request, maxBytes);
  let data: unknown;
  try {
    data = JSON.parse(Buffer.from(bytes).toString("utf8"));
  } catch {
    throw new HttpError(400, "INVALID_JSON", "The request body is not valid JSON.");
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "VALIDATION_ERROR", result.error.issues[0]?.message ?? "Check your input.");
  }
  return result.data;
}

export function handleApiError(error: unknown): Response {
  if (error instanceof HttpError) return apiError(error.status, error.code, error.message);
  if (error instanceof Error && error.message === "MATERIAL_LIMIT_REACHED") {
    return apiError(409, "MATERIAL_LIMIT_REACHED", "This starter workspace has reached its material limit.");
  }
  // Do not log uploaded material, request bodies, or provider secrets.
  console.error("LexiLearn request failed:", error instanceof Error ? error.name : "UnknownError");
  return apiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}
