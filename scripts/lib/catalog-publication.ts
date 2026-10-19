export type RefreshConfiguration = { url: string; secret: string };
type PublicationEnvironment = { DATABASE_URL?: string; REVALIDATION_SECRET?: string; CACHE_REVALIDATION_URL?: string };

function currentEnvironment(): PublicationEnvironment {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    REVALIDATION_SECRET: process.env.REVALIDATION_SECRET,
    CACHE_REVALIDATION_URL: process.env.CACHE_REVALIDATION_URL,
  };
}

export function refreshConfiguration(env: PublicationEnvironment = currentEnvironment()): RefreshConfiguration {
  const secret = env.REVALIDATION_SECRET;
  if (!secret || secret.length < 32) throw new Error("REVALIDATION_SECRET must contain at least 32 characters (use the same value on the deployed app and in the operator environment)");
  if (!env.CACHE_REVALIDATION_URL) throw new Error("CACHE_REVALIDATION_URL is required, for example https://your-site.example/api/revalidate");
  const url = new URL(env.CACHE_REVALIDATION_URL);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(loopback && url.protocol === "http:"))
    || url.username || url.password || url.search || url.hash || url.pathname !== "/api/revalidate") {
    throw new Error("CACHE_REVALIDATION_URL must be an HTTPS /api/revalidate URL without credentials, query, or fragment (HTTP is allowed only on loopback)");
  }
  return { url: url.toString(), secret };
}

export function publicationConfiguration(env: PublicationEnvironment = currentEnvironment()): RefreshConfiguration | null {
  // A regular local seed must work without production credentials or a running
  // Next.js server. Only an explicitly loopback database gets this exemption.
  if (!env.REVALIDATION_SECRET && !env.CACHE_REVALIDATION_URL && env.DATABASE_URL) {
    const database = new URL(env.DATABASE_URL);
    if (["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)) return null;
  }
  return refreshConfiguration(env);
}

export async function refreshCatalog(config = refreshConfiguration(), fetcher: typeof fetch = fetch) {
  let response: Response;
  try {
    response = await fetcher(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.secret}` },
      body: JSON.stringify({ catalog: true }),
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Catalog cache refresh could not reach the configured endpoint. Database changes are committed; rerun npm run cache:refresh without replaying the write");
  }
  const result = await response.json().catch(() => null) as { revalidated?: boolean } | null;
  if (!response.ok || result?.revalidated !== true) {
    throw new Error(`Catalog cache refresh failed (HTTP ${response.status}). Database changes are committed; verify the deployed endpoint and shared secret, then rerun npm run cache:refresh without replaying the write`);
  }
  console.log("Catalog cache expired; the next request will read the published content.");
}

// Keep a single refresh per operator run, including runs that commit some writes
// and later fail. markChanged() is called only after a write has succeeded.
export class CatalogPublication {
  private dirty = false;
  private configuration: RefreshConfiguration | null | undefined;
  constructor(private options: {
    environment?: () => PublicationEnvironment;
    refresh?: typeof refreshCatalog;
    info?: (message: string) => void;
  } = {}) {}
  prepare() {
    if (this.configuration === undefined) this.configuration = publicationConfiguration(this.options.environment?.() ?? currentEnvironment());
  }
  canWritePublic() {
    try { this.prepare(); return true; } catch { return false; }
  }
  markChanged() { this.dirty = true; }
  async refresh() {
    if (!this.dirty) return;
    try {
      this.prepare();
      if (this.configuration === null) {
        (this.options.info ?? console.log)("Local database changed; remote cache refresh skipped because no refresh endpoint is configured. Configure a local /api/revalidate endpoint, or stop the local server, clear .next/cache, and restart it.");
      } else {
        await (this.options.refresh ?? refreshCatalog)(this.configuration!);
      }
    } catch (error) {
      throw new Error(`Database changes were saved, but catalog cache refresh is incomplete. ${error instanceof Error ? error.message : "Rerun npm run cache:refresh"}`);
    }
    this.dirty = false;
  }
}

export async function runWithPublication<T>(
  run: () => Promise<T>,
  publication: () => CatalogPublication | undefined,
  disconnect: () => Promise<void>,
) {
  const errors: unknown[] = [];
  let result: T | undefined;
  try { result = await run(); } catch (error) { errors.push(error); }
  try { await publication()?.refresh(); } catch (error) { errors.push(error); }
  try { await disconnect(); } catch (error) { errors.push(error); }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    throw new AggregateError(errors, errors.map((error) => error instanceof Error ? error.message : "Unknown operation error").join("\n"));
  }
  return result as T;
}
