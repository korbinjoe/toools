/**
 * Product Hunt Bulk Import Script
 *
 * Usage:
 *   PRODUCTHUNT_TOKEN=xxx npx tsx scripts/import-producthunt.ts
 *
 * Env:
 *   PRODUCTHUNT_TOKEN - Developer token from producthunt.com/v2/oauth/applications
 *   DATABASE_URL - Postgres connection string
 *
 * Options (via env):
 *   PH_POSTS_PER_TOPIC - Number of posts to fetch per topic (default: 100)
 *   All new tools are PENDING; auto-approval is intentionally unsupported.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PH_TOPIC_MAP } from "./lib/category-matcher";
import { ImportStore } from "./lib/import-store";
import { getProductHuntToken } from "./lib/producthunt-auth";
import { runWithPublication } from "./lib/catalog-publication";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });
let store: ImportStore | undefined;

const PH_API = "https://api.producthunt.com/v2/api/graphql";
const POSTS_PER_TOPIC = parseInt(process.env.PH_POSTS_PER_TOPIC || "100", 10);

interface PHPost {
  id: string;
  name: string;
  tagline: string;
  description: string | null;
  url: string;
  website: string;
  thumbnail: { url: string } | null;
  topics: { edges: { node: { name: string; slug: string } }[] };
  votesCount: number;
  createdAt: string;
}

const QUERY = `
  query GetPosts($cursor: String, $topic: String, $first: Int!) {
    posts(first: $first, after: $cursor, topic: $topic, order: VOTES) {
      edges {
        node {
          id
          name
          tagline
          description
          url
          website
          thumbnail { url }
          topics { edges { node { name slug } } }
          votesCount
          createdAt
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function fetchPosts(
  token: string,
  topic: string,
  cursor: string | null,
  first: number,
): Promise<{
  posts: PHPost[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const res = await fetch(PH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { topic, cursor, first: Math.min(first, 20) },
    }),
  });

  if (res.status === 429) {
    const text = await res.text();
    const match = text.match(/"reset_in":(\d+)/);
    const waitSec = match ? parseInt(match[1], 10) : 900;
    console.log(`  Rate limited. Waiting ${waitSec}s...`);
    await new Promise((r) => setTimeout(r, waitSec * 1000));
    return fetchPosts(token, topic, cursor, first);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PH API error ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    data?: {
      posts: {
        edges: { node: PHPost }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    };
    errors?: { message: string }[];
  };

  if (json.errors) {
    throw new Error(`PH GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  const data = json.data!.posts;
  return {
    posts: data.edges.map((e) => e.node),
    hasNextPage: data.pageInfo.hasNextPage,
    endCursor: data.pageInfo.endCursor,
  };
}

async function fetchAllPostsForTopic(
  token: string,
  topic: string,
  limit: number,
): Promise<PHPost[]> {
  const all: PHPost[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext && all.length < limit) {
    const remaining = limit - all.length;
    const { posts, hasNextPage, endCursor } = await fetchPosts(
      token,
      topic,
      cursor,
      remaining,
    );
    all.push(...posts);
    hasNext = hasNextPage && posts.length > 0;
    cursor = endCursor;
    await new Promise((r) => setTimeout(r, 200));
  }

  return all.slice(0, limit);
}

async function main() {
  const token = await getProductHuntToken();
  if (!token) {
    console.error("Error: set PRODUCTHUNT_TOKEN or PRODUCTHUNT_API_KEY/SECRET");
    process.exit(1);
  }

  console.log("=== Product Hunt Import ===\n");
  console.log(`Posts per topic: ${POSTS_PER_TOPIC}`);
  console.log("New tools: PENDING (no auto-approval)");
  console.log(`Topics to scrape: ${Object.keys(PH_TOPIC_MAP).length}\n`);

  store = await ImportStore.connect(prisma);

  // Load category map
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let errors = 0;

  const topics = Object.keys(PH_TOPIC_MAP);

  for (const topic of topics) {
    const categorySlug = PH_TOPIC_MAP[topic];
    const categoryId = categoryBySlug.get(categorySlug);

    if (!categoryId) {
      console.warn(`  Category "${categorySlug}" not found in DB, skipping topic "${topic}"`);
      skipped++;
      continue;
    }

    console.log(`Fetching topic: ${topic} → ${categorySlug}...`);

    let posts: PHPost[];
    try {
      posts = await fetchAllPostsForTopic(token, topic, POSTS_PER_TOPIC);
    } catch (err) {
      console.error(`  Error fetching topic "${topic}":`, (err as Error).message);
      errors++;
      continue;
    }

    console.log(`  Got ${posts.length} posts`);

    for (const post of posts) {
      const toolUrl = post.website || post.url;
      try {
        const result = await store.ingest({
          name: post.name,
          tagline: post.tagline,
          description: post.description || post.tagline,
          url: toolUrl,
          categoryHints: [categorySlug], categorySlug,
          pricing: "FREEMIUM", platforms: ["Web"],
          featured: post.votesCount > 1000, phVotes: post.votesCount,
          discovery: {
            source: "PRODUCT_HUNT", method: "product-hunt-topic",
            sourceKey: `${post.id}:${topic}`, sourceUrl: post.url,
            metadata: { postId: post.id, topic, pricingNeedsReview: true },
          },
        });
        if (result.action === "created") imported++;
        else updated++;
      } catch (err) {
        console.error(`  Error importing "${post.name}":`, (err as Error).message);
        errors++;
      }
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`  Imported: ${imported}`);
  console.log(`  Updated (signals): ${updated}`);
  console.log(`  Skipped (duplicate): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  if (errors) process.exitCode = 1;
}

runWithPublication(main, () => store?.publication, () => prisma.$disconnect())
  .catch((e) => {
    console.error(e instanceof Error ? e.message : "Product Hunt import failed");
    process.exitCode = 1;
  });
