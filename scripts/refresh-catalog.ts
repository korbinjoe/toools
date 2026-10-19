import "dotenv/config";
import { refreshCatalog } from "./lib/catalog-publication";

async function main() {
  if (process.argv.slice(2).some((arg) => arg !== "--help")) throw new Error("Usage: npm run cache:refresh (no path or tag arguments)");
  if (process.argv.includes("--help")) {
    console.log("Expire the published catalog cache. Requires CACHE_REVALIDATION_URL and REVALIDATION_SECRET. No database connection or writes.");
    return;
  }
  await refreshCatalog();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Cache refresh failed");
  process.exitCode = 1;
});
