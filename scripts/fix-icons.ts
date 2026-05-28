/**
 * Fix tool icons by resolving real URLs from PH redirects and GitHub repos.
 *
 * Usage:
 *   npx tsx scripts/fix-icons.ts
 *   DRY_RUN=false npx tsx scripts/fix-icons.ts
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getGoogleFaviconUrl } from "./lib/favicon";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.env.DRY_RUN !== "false";
const CONCURRENCY = 20;
const TIMEOUT_MS = 8000;

async function resolveRedirect(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Toools/1.0)" },
    });
    clearTimeout(timer);
    return res.url;
  } catch {
    // HEAD might be blocked, try GET
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Toools/1.0)" },
      });
      clearTimeout(timer);
      return res.url;
    } catch {
      return null;
    }
  }
}

async function getGitHubHomepage(repoUrl: string): Promise<string | null> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`https://api.github.com/repos/${match[1]}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Toools/1.0",
        Accept: "application/vnd.github.v3+json",
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { homepage?: string };
    if (data.homepage && data.homepage.length > 0 && !data.homepage.includes("github.com")) {
      return data.homepage;
    }
    return null;
  } catch {
    return null;
  }
}

function isGenericDomain(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ["www.producthunt.com", "producthunt.com", "github.com", "www.github.com", "apps.apple.com"].includes(host);
  } catch {
    return false;
  }
}

async function processBatch<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
}

async function main() {
  console.log(`=== Fix Tool Icons ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  // Phase 1: Fix PH redirect URLs
  const phTools = await prisma.tool.findMany({
    where: { status: "APPROVED", url: { contains: "producthunt.com" } },
    select: { id: true, name: true, url: true },
  });
  console.log(`PH redirect URLs to resolve: ${phTools.length}`);

  let phFixed = 0;
  let phFailed = 0;

  await processBatch(
    phTools,
    async (tool) => {
      const realUrl = await resolveRedirect(tool.url);
      if (realUrl && !isGenericDomain(realUrl)) {
        phFixed++;
        if (!DRY_RUN) {
          await prisma.tool.update({
            where: { id: tool.id },
            data: {
              url: realUrl,
              iconUrl: getGoogleFaviconUrl(realUrl),
            },
          });
        }
      } else {
        phFailed++;
      }
    },
    CONCURRENCY,
  );

  console.log(`  Resolved: ${phFixed}`);
  console.log(`  Failed: ${phFailed}\n`);

  // Phase 2: Fix GitHub URLs — try to get homepage from GitHub API
  const ghTools = await prisma.tool.findMany({
    where: {
      status: "APPROVED",
      url: { contains: "github.com" },
      iconUrl: { contains: "github.com" },
    },
    select: { id: true, name: true, url: true },
  });
  console.log(`GitHub URLs to check for homepage: ${ghTools.length}`);

  let ghFixed = 0;
  let ghNoHomepage = 0;

  await processBatch(
    ghTools,
    async (tool) => {
      const homepage = await getGitHubHomepage(tool.url);
      if (homepage && !isGenericDomain(homepage)) {
        ghFixed++;
        if (!DRY_RUN) {
          await prisma.tool.update({
            where: { id: tool.id },
            data: { iconUrl: getGoogleFaviconUrl(homepage) },
          });
        }
      } else {
        ghNoHomepage++;
      }
    },
    CONCURRENCY,
  );

  console.log(`  Got homepage icon: ${ghFixed}`);
  console.log(`  No homepage found: ${ghNoHomepage}\n`);

  // Summary
  const remaining = await prisma.tool.count({
    where: {
      status: "APPROVED",
      OR: [
        { iconUrl: { contains: "producthunt.com" } },
        { iconUrl: { contains: "github.com" } },
      ],
    },
  });
  console.log(`Remaining generic icons: ${remaining}`);

  if (DRY_RUN) {
    console.log("\n(Dry run — set DRY_RUN=false to apply)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
