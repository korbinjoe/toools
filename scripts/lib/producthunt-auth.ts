/**
 * Obtain a Product Hunt API v2 bearer token.
 * Uses PRODUCTHUNT_TOKEN if set, otherwise exchanges
 * PRODUCTHUNT_API_KEY + PRODUCTHUNT_API_SECRET via client_credentials.
 */
export async function getProductHuntToken(): Promise<string | null> {
  if (process.env.PRODUCTHUNT_TOKEN) {
    return process.env.PRODUCTHUNT_TOKEN;
  }

  const clientId = process.env.PRODUCTHUNT_API_KEY;
  const clientSecret = process.env.PRODUCTHUNT_API_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch("https://api.producthunt.com/v2/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}
