import { validBearer } from "../../revalidate/handler";

function json(body: unknown, status: number) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function createMetricsCronHandler(
  flush: () => Promise<unknown>,
  getSecret = () => process.env.CRON_SECRET,
) {
  return async function GET(request: Request) {
    const secret = getSecret();
    if (!secret || secret.length < 32) {
      return json({ error: "Metric cron is not configured: CRON_SECRET must contain at least 32 characters" }, 503);
    }
    if (!validBearer(request, secret)) return json({ error: "Unauthorized" }, 401);
    try {
      return json(await flush(), 200);
    } catch (error) {
      console.error("Metric queue drain failed", error instanceof Error ? error.name : "Unknown error");
      return json({ error: "Metric queue drain failed; unacknowledged events remain queued for retry" }, 500);
    }
  };
}
