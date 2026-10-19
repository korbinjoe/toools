import { unstable_cache } from "next/cache";

// Every public catalog read participates in publication invalidation, including
// cached misses. Counter batches may invalidate only entries showing metrics.
export const CATALOG_CACHE_TAG = "toools:catalog";
export const CATALOG_METRICS_CACHE_TAG = "toools:catalog-metrics";
export const CATALOG_REVALIDATE_SECONDS = 60 * 60;

export function catalogCache<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  key: string,
  { metrics = false }: { metrics?: boolean } = {},
) {
  return unstable_cache(read, ["catalog-v1", key], {
    revalidate: CATALOG_REVALIDATE_SECONDS,
    tags: metrics
      ? [CATALOG_CACHE_TAG, CATALOG_METRICS_CACHE_TAG]
      : [CATALOG_CACHE_TAG],
  });
}
