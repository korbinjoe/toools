import { createHash, timingSafeEqual } from "node:crypto";

const MAX_BODY_BYTES = 1024;

export function expireCatalog(
  tag: string,
  revalidateTag: (tag: string, profile: { expire: number }) => void,
  revalidatePath: (path: string, type: "layout") => void,
) {
  revalidateTag(tag, { expire: 0 });
  revalidatePath("/", "layout");
}

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Compare fixed-length digests so neither token length nor prefix affects the
// comparison. Secrets live only in the server/operator environment.
export function validBearer(request: Request, secret: string) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  return timingSafeEqual(
    createHash("sha256").update(token).digest(),
    createHash("sha256").update(secret).digest(),
  );
}

async function readPayload(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Expected a JSON body");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("Request body exceeds 1024 bytes");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function createRevalidationHandler(invalidate: () => void, getSecret = () => process.env.REVALIDATION_SECRET) {
  return async function POST(request: Request) {
    const secret = getSecret();
    if (!secret || secret.length < 32) {
      return json({ error: "Cache revalidation is not configured: REVALIDATION_SECRET must contain at least 32 characters" }, 503);
    }
    if (!validBearer(request, secret)) return json({ error: "Unauthorized" }, 401);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      return json({ error: "Content-Type must be application/json" }, 415);
    }
    try {
      const payload = await readPayload(request);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)
        || Object.keys(payload).length !== 1 || !("catalog" in payload) || payload.catalog !== true) {
        return json({ error: "Expected exactly {\"catalog\":true}; custom paths and tags are not supported" }, 400);
      }
    } catch {
      return json({ error: "Expected valid JSON no larger than 1024 bytes" }, 400);
    }
    try {
      invalidate();
      return json({ revalidated: true, catalog: true }, 200);
    } catch (error) {
      console.error("Catalog cache invalidation failed", error instanceof Error ? error.name : "Unknown error");
      return json({ error: "Cache invalidation failed; database changes are unaffected. Retry cache:refresh" }, 500);
    }
  };
}
