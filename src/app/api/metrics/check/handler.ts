import { validBearer } from "../../revalidate/handler";

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function createMetricsCheckHandler(
  check: () => Promise<unknown>,
  getSecret = () => process.env.CRON_SECRET,
) {
  return async function POST(request: Request) {
    const secret = getSecret();
    if (!secret || secret.length < 32) return json({ error: "Metric queue validation is not configured" }, 503);
    if (!validBearer(request, secret)) return json({ error: "Unauthorized" }, 401);
    // Neither topic, consumer, event, nor tool IDs may be selected by the caller.
    if (request.body || new URL(request.url).search) return json({ error: "This endpoint accepts an empty POST only" }, 400);
    try {
      return json(await check(), 200);
    } catch {
      return json({ error: "Isolated metric queue validation failed; statistics mode was not changed" }, 503);
    }
  };
}
