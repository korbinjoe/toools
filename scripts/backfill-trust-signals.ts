/**
 * Backfill trust signal fields for tools imported before schema migration.
 *
 * Usage:
 *   npx tsx scripts/backfill-trust-signals.ts [options]
 *
 * Options:
 *   --skip-awesome       Skip awesome-list source backfill
 *   --skip-github-stars  Skip GitHub stars fetch
 *   --skip-producthunt   Skip Product Hunt backfill
 *   --limit N            Max GitHub star lookups (default: unlimited)
 *   --dry-run            Log updates without writing
 *
 * Env:
 *   DATABASE_URL         Required
 *   GITHUB_TOKEN         Recommended for github stars phase (5000 req/hr)
 *   PRODUCTHUNT_TOKEN    Required for product hunt phase
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizeUrl } from "./lib/dedup";
import { getUrlIndex } from "./lib/url-index";
import { fetchGithubStars } from "./lib/github";
import {
  AWESOME_REPOS,
  fetchAwesomeReadme,
  parseAwesomeReadme,
} from "./lib/awesome";
import { PH_TOPIC_MAP } from "./lib/category-matcher";
import { getProductHuntToken } from "./lib/producthunt-auth";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipAwesome = args.includes("--skip-awesome");
const skipGithubStars = args.includes("--skip-github-stars");
const skipProductHunt = args.includes("--skip-producthunt");
const limitIdx = args.indexOf("--limit");
const githubLimit =
  limitIdx >= 0 ? parseInt(args[limitIdx + 1] || "0", 10) : Infinity;

interface PHPost {
  name: string;
  url: string;
  website: string;
  votesCount: number;
}

const PH_API = "https://api.producthunt.com/v2/api/graphql";
const PH_QUERY = `
  query GetPosts($cursor: String, $topic: String, $first: Int!) {
    posts(first: $first, after: $cursor, topic: $topic, order: VOTES) {
      edges {
        node {
          name
          url
          website
          votesCount
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface SignalUpdate {
  id: string;
  data: {
    source: "AWESOME_LIST";
    sourceUrl: string;
    github?: string;
    isOpenSource?: boolean;
  };
}

async function applyUpdates(updates: SignalUpdate[]) {
  if (updates.length === 0) return 0;

  const CONCURRENCY = 15;
  let applied = 0;

  for (let i = 0; i < updates.length; i += CONCURRENCY) {
    const batch = updates.slice(i, i + CONCURRENCY);
    if (dryRun) {
      applied += batch.length;
      continue;
    }

    const results = await Promise.allSettled(
      batch.map(({ id, data }) =>
        prisma.tool.update({ where: { id }, data }),
      ),
    );

    for (const result of results) {
      if (result.status === "fulfilled") applied++;
    }
  }

  return applied;
}

async function backfillAwesome(urlIndex: Map<string, string>) {
  console.log("\n=== Phase 1: Awesome List signals ===\n");

  let matched = 0;
  let updated = 0;
  let errors = 0;
  const pending: SignalUpdate[] = [];

  for (const { owner, repo } of AWESOME_REPOS) {
    process.stdout.write(`Fetching ${owner}/${repo}... `);

    let readme: string;
    try {
      readme = await fetchAwesomeReadme(owner, repo);
    } catch (err) {
      console.log(`error (${(err as Error).message})`);
      errors++;
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const parsed = parseAwesomeReadme(readme);
    console.log(`${parsed.length} entries`);

    for (const tool of parsed) {
      const normalized = normalizeUrl(tool.url);
      const toolId = urlIndex.get(normalized);
      if (!toolId) continue;

      matched++;

      const data: SignalUpdate["data"] = {
        source: "AWESOME_LIST",
        sourceUrl: tool.url,
      };

      if (tool.github) {
        data.github = tool.github;
        data.isOpenSource = true;
      }

      pending.push({ id: toolId, data });
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // Deduplicate by tool id — last awesome-list entry wins
  const byId = new Map<string, SignalUpdate["data"]>();
  for (const { id, data } of pending) {
    const prev = byId.get(id);
    byId.set(id, prev ? { ...prev, ...data } : data);
  }

  const uniqueUpdates = [...byId.entries()].map(([id, data]) => ({ id, data }));
  console.log(`\n  Applying ${uniqueUpdates.length} updates...`);

  try {
    updated = await applyUpdates(uniqueUpdates);
  } catch (err) {
    console.error("  Apply failed:", (err as Error).message);
    errors++;
  }

  console.log(`  Matched: ${matched} | Updated: ${updated} | Errors: ${errors}`);
}

async function backfillGithubStars() {
  console.log("\n=== Phase 2: GitHub stars ===\n");

  if (!process.env.GITHUB_TOKEN) {
    console.warn(
      "  Warning: GITHUB_TOKEN not set — unauthenticated API allows ~60 req/hr.",
    );
    console.warn("  Use --limit 50 or set GITHUB_TOKEN for full backfill.\n");
  }

  const tools = await prisma.tool.findMany({
    where: {
      github: { not: null },
      OR: [{ githubStars: null }, { githubStars: 0 }],
    },
    select: { id: true, slug: true, github: true },
    orderBy: { viewCount: "desc" },
    ...(Number.isFinite(githubLimit) ? { take: githubLimit } : {}),
  });

  console.log(`  Tools to update: ${tools.length}${Number.isFinite(githubLimit) ? ` (limit ${githubLimit})` : ""}`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let rateLimited = false;

  for (const tool of tools) {
    if (!tool.github || rateLimited) break;

    const stars = await fetchGithubStars(tool.github);

    if (stars === null) {
      skipped++;
      await new Promise((r) => setTimeout(r, 100));
      continue;
    }

    if (dryRun) {
      console.log(`  [dry-run] ${tool.slug}: ${stars} stars`);
      updated++;
    } else {
      try {
        await prisma.tool.update({
          where: { id: tool.id },
          data: { githubStars: stars },
        });
        updated++;
      } catch {
        errors++;
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`\n  Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`);
}

async function fetchPHPosts(
  token: string,
  topic: string,
  limit: number,
): Promise<PHPost[]> {
  const all: PHPost[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext && all.length < limit) {
    const res = await fetch(PH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: PH_QUERY,
        variables: {
          topic,
          cursor,
          first: Math.min(limit - all.length, 20),
        },
      }),
    });

    if (res.status === 429) {
      throw new Error("Product Hunt rate limited");
    }
    if (!res.ok) {
      throw new Error(`PH API error ${res.status}`);
    }

    const json = (await res.json()) as {
      data?: {
        posts: {
          edges: { node: PHPost }[];
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join(", "));
    }

    const data = json.data!.posts;
    all.push(...data.edges.map((e) => e.node));
    hasNext = data.pageInfo.hasNextPage && data.edges.length > 0;
    cursor = data.pageInfo.endCursor;
    await new Promise((r) => setTimeout(r, 200));
  }

  return all.slice(0, limit);
}

async function backfillProductHunt(urlIndex: Map<string, string>) {
  console.log("\n=== Phase 3: Product Hunt signals ===\n");

  const token = await getProductHuntToken();
  if (!token) {
    console.log("  Skipped — set PRODUCTHUNT_TOKEN or PRODUCTHUNT_API_KEY/SECRET");
    return;
  }

  const postsPerTopic = parseInt(process.env.PH_POSTS_PER_TOPIC || "100", 10);
  let matched = 0;
  let updated = 0;
  let errors = 0;
  const pending: { id: string; data: {
    phVotes: number;
    source: "PRODUCT_HUNT";
    sourceUrl: string;
    featured: boolean;
  } }[] = [];

  for (const topic of Object.keys(PH_TOPIC_MAP)) {
    process.stdout.write(`  Topic ${topic}... `);

    let posts: PHPost[];
    try {
      posts = await fetchPHPosts(token, topic, postsPerTopic);
    } catch (err) {
      console.log(`error (${(err as Error).message})`);
      errors++;
      continue;
    }

    console.log(`${posts.length} posts`);

    for (const post of posts) {
      const toolUrl = post.website || post.url;
      const normalized = normalizeUrl(toolUrl);
      const toolId = urlIndex.get(normalized);
      if (!toolId) continue;

      matched++;

      pending.push({
        id: toolId,
        data: {
          phVotes: post.votesCount,
          source: "PRODUCT_HUNT",
          sourceUrl: post.url,
          featured: post.votesCount > 1000,
        },
      });
    }
  }

  const byId = new Map<string, (typeof pending)[0]["data"]>();
  for (const { id, data } of pending) {
    const prev = byId.get(id);
    if (!prev || data.phVotes > prev.phVotes) {
      byId.set(id, data);
    }
  }

  const uniqueUpdates = [...byId.entries()].map(([id, data]) => ({ id, data }));
  console.log(`\n  Applying ${uniqueUpdates.length} PH updates...`);

  const CONCURRENCY = 15;
  for (let i = 0; i < uniqueUpdates.length; i += CONCURRENCY) {
    const batch = uniqueUpdates.slice(i, i + CONCURRENCY);
    if (dryRun) {
      updated += batch.length;
      continue;
    }
    const results = await Promise.allSettled(
      batch.map(({ id, data }) =>
        prisma.tool.update({ where: { id }, data }),
      ),
    );
    updated += results.filter((r) => r.status === "fulfilled").length;
    errors += results.filter((r) => r.status === "rejected").length;
  }

  console.log(`\n  Matched: ${matched} | Updated: ${updated} | Errors: ${errors}`);
}

async function printStats() {
  const [withSource, withStars, withVotes, featured] = await Promise.all([
    prisma.tool.count({
      where: { status: "APPROVED", source: { in: ["AWESOME_LIST", "PRODUCT_HUNT"] } },
    }),
    prisma.tool.count({
      where: { status: "APPROVED", githubStars: { gt: 0 } },
    }),
    prisma.tool.count({
      where: { status: "APPROVED", phVotes: { gt: 0 } },
    }),
    prisma.tool.count({
      where: { status: "APPROVED", featured: true },
    }),
  ]);

  console.log("\n=== Coverage (approved tools) ===");
  console.log(`  External source: ${withSource}`);
  console.log(`  GitHub stars:    ${withStars}`);
  console.log(`  PH votes:        ${withVotes}`);
  console.log(`  Featured:        ${featured}`);
}

async function main() {
  console.log("=== Backfill Trust Signals ===");
  if (dryRun) console.log("  (dry-run mode — no writes)\n");

  const urlIndex = await getUrlIndex(prisma);
  console.log(`Loaded ${urlIndex.size} tools by URL index`);

  if (!skipAwesome) {
    await backfillAwesome(urlIndex);
  }
  if (!skipGithubStars) {
    await backfillGithubStars();
  }
  if (!skipProductHunt) {
    await backfillProductHunt(urlIndex);
  }

  await printStats();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
