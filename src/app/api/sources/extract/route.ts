import { checkOrigin, handleApiError, HttpError, readBody } from "@/server/http";
import { extractFile, MAX_FILE_BYTES } from "@/server/ingestion/extract";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) throw new HttpError(415, "UNSUPPORTED_CONTENT_TYPE", "Choose a source file to import.");
    const bytes = await readBody(request, MAX_FILE_BYTES + 100_000);
    let form: FormData;
    try { form = await new Response(Buffer.from(bytes), { headers: { "Content-Type": contentType } }).formData(); }
    catch { throw new HttpError(400, "INVALID_FILE", "The file upload could not be read. Please choose the file again."); }
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "INVALID_FILE", "Choose a source file to import.");
    return Response.json(await extractFile(file));
  } catch (error) { return handleApiError(error); }
}
