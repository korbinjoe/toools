const LEGACY_SSL_MODES = /([?&])sslmode=(prefer|require|verify-ca)(?=(&|$))/i;

/** Map legacy sslmode values to verify-full (pg v8 current strict behavior). */
export function normalizePgSslMode(url: string): string {
  return url.replace(LEGACY_SSL_MODES, "$1sslmode=verify-full");
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  return normalizePgSslMode(url);
}
