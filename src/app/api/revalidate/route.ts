import { revalidatePath, revalidateTag } from "next/cache";
import { CATALOG_CACHE_TAG } from "@/lib/catalog-cache";
import { createRevalidationHandler, expireCatalog } from "./handler";

export const runtime = "nodejs";

export const POST = createRevalidationHandler(() => {
  // This webhook runs only after publication commits. expire: 0 makes the next
  // reader wait for fresh content instead of receiving the pre-publication copy.
  expireCatalog(CATALOG_CACHE_TAG, revalidateTag, revalidatePath);
  // Includes the sitemap, footer, and previously cached 404s for new slugs.
});
