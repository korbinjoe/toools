/**
 * Fix tool icons by discovering real website domains.
 *
 * Strategy:
 *   1. Tools with PH/GitHub/Apple Store URLs → guess domain from tool name
 *   2. Probe candidate domains (name.com, name.io, name.app, etc.)
 *   3. Update iconUrl to Google favicon of the real domain
 *
 * Usage:
 *   npx tsx scripts/fix-icons.ts            # dry run
 *   DRY_RUN=false npx tsx scripts/fix-icons.ts   # apply
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getGoogleFaviconUrl } from "./lib/favicon";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const DRY_RUN = process.env.DRY_RUN !== "false";
const CONCURRENCY = 30;
const TIMEOUT_MS = 5000;

const TLDS = [".com", ".io", ".app", ".dev", ".ai", ".co", ".org", ".net", ".so", ".sh", ".tools"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function getCandidateDomains(name: string): string[] {
  const slug = slugify(name);
  if (!slug) return [];

  const slugHyphen = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .trim();

  const candidates = new Set<string>();
  for (const tld of TLDS) {
    candidates.add(slug + tld);
    if (slugHyphen !== slug) {
      candidates.add(slugHyphen + tld);
    }
  }
  return [...candidates];
}

async function probeDomain(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`https://${domain}`, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    clearTimeout(timer);
    return res.ok || res.status === 403 || res.status === 405;
  } catch {
    return false;
  }
}

async function findRealDomain(name: string): Promise<string | null> {
  const candidates = getCandidateDomains(name);
  for (const domain of candidates) {
    if (await probeDomain(domain)) {
      return domain;
    }
  }
  return null;
}

function isGenericIcon(iconUrl: string | null): boolean {
  if (!iconUrl) return true;
  return (
    iconUrl.includes("producthunt.com") ||
    iconUrl.includes("github.com") ||
    iconUrl.includes("apps.apple.com")
  );
}

async function processBatch<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number,
  label: string,
): Promise<void> {
  let done = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    await Promise.all(batch.map(fn));
    done += batch.length;
    if (done % 100 === 0 || done === items.length) {
      process.stdout.write(`\r  ${label}: ${done}/${items.length}`);
    }
  }
  console.log();
}

async function main() {
  console.log(`=== Fix Tool Icons ${DRY_RUN ? "(DRY RUN)" : "(LIVE)"} ===\n`);

  const tools = await prisma.tool.findMany({
    where: { status: "APPROVED" },
    select: { id: true, name: true, url: true, iconUrl: true },
  });

  const needFix = tools.filter((t) => isGenericIcon(t.iconUrl));
  console.log(`Tools with generic icons: ${needFix.length}/${tools.length}\n`);

  let fixed = 0;
  let notFound = 0;

  await processBatch(
    needFix,
    async (tool) => {
      const domain = await findRealDomain(tool.name);
      if (domain) {
        fixed++;
        if (!DRY_RUN) {
          await prisma.tool.update({
            where: { id: tool.id },
            data: { iconUrl: getGoogleFaviconUrl(`https://${domain}`) },
          });
        }
      } else {
        notFound++;
      }
    },
    CONCURRENCY,
    "Probing",
  );

  console.log(`\n=== Results ===`);
  console.log(`  Fixed: ${fixed}`);
  console.log(`  Not found: ${notFound}`);

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
