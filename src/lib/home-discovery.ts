interface DiscoveryTool {
  slug: string;
  category: { slug: string };
  createdAt: Date;
}

/** Prefer category variety without leaving gaps when the collection is small. */
export function selectRecentTools<T extends DiscoveryTool>(
  tools: T[],
  limit = 6,
): T[] {
  // Do not pull months-old entries into the recent list just for category variety.
  const newest = tools[0]?.createdAt.getTime() ?? 0;
  const recentPool = tools.filter(
    (tool) => tool.createdAt.getTime() >= newest - 30 * 86_400_000,
  );
  const selected = new Set<string>();
  const counts = new Map<string, number>();

  for (const tool of recentPool) {
    if (selected.size >= limit) break;
    const count = counts.get(tool.category.slug) ?? 0;
    if (count >= 2 || selected.has(tool.slug)) continue;
    selected.add(tool.slug);
    counts.set(tool.category.slug, count + 1);
  }

  for (const tool of recentPool) {
    if (selected.size >= limit) break;
    selected.add(tool.slug);
  }

  // Keep the original newest-first order after selecting a varied set.
  const seen = new Set<string>();
  return recentPool.filter((tool) => {
    if (!selected.has(tool.slug) || seen.has(tool.slug)) return false;
    seen.add(tool.slug);
    return true;
  });
}

export function selectHomeDiscovery<T extends DiscoveryTool>(
  featured: T[],
  recentPool: T[],
) {
  const recent = selectRecentTools(recentPool);
  const recentSlugs = new Set(recent.map((tool) => tool.slug));
  const available = featured.filter((tool) => !recentSlugs.has(tool.slug));
  const candidates =
    available.length > 0
      ? available
      : recentPool.filter((tool) => !recentSlugs.has(tool.slug));
  const discoveryCount = Math.min(
    6,
    Math.max(2, Math.ceil(candidates.length / 2)),
  );
  const discoveries = candidates.slice(0, discoveryCount);
  const reserved = new Set([
    ...recentSlugs,
    ...discoveries.map((tool) => tool.slug),
  ]);
  const picks = featured.filter((tool) => !reserved.has(tool.slug)).slice(0, 4);

  return { recent, discoveries, picks };
}

/** A stable daily slot, using the site's editorial day in Asia/Shanghai. */
export function getDiscoveryIndex(count: number, now = new Date()): number {
  if (count <= 0) return 0;
  const day = Math.floor((now.getTime() + 8 * 60 * 60 * 1000) / 86_400_000);
  return ((day % count) + count) % count;
}
