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
 *   PH_AUTO_APPROVE - Set to "true" to mark imports as APPROVED (default: PENDING)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { PH_TOPIC_MAP } from "./lib/category-matcher";
import {
  normalizeUrl,
  generateSlug,
  getExistingUrls,
  getExistingSlugs,
  deduplicateSlug,
} from "./lib/dedup";
import { getGoogleFaviconUrl } from "./lib/favicon";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const PH_API = "https://api.producthunt.com/v2/api/graphql";
const TOKEN = process.env.PRODUCTHUNT_TOKEN;
const POSTS_PER_TOPIC = parseInt(process.env.PH_POSTS_PER_TOPIC || "100", 10);
const AUTO_APPROVE = process.env.PH_AUTO_APPROVE === "true";

if (!TOKEN) {
  console.error("Error: PRODUCTHUNT_TOKEN environment variable is required.");
  console.error("Get one at: https://www.producthunt.com/v2/oauth/applications");
  process.exit(1);
}

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

async function fetchPosts(topic: string, cursor: string | null, first: number): Promise<{
  posts: PHPost[];
  hasNextPage: boolean;
  endCursor: string | null;
}> {
  const res = await fetch(PH_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { topic, cursor, first: Math.min(first, 20) },
    }),
  });

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

async function fetchAllPostsForTopic(topic: string, limit: number): Promise<PHPost[]> {
  const all: PHPost[] = [];
  let cursor: string | null = null;
  let hasNext = true;

  while (hasNext && all.length < limit) {
    const remaining = limit - all.length;
    const { posts, hasNextPage, endCursor } = await fetchPosts(topic, cursor, remaining);
    all.push(...posts);
    hasNext = hasNextPage && posts.length > 0;
    cursor = endCursor;
    // Rate limit: ~200ms between requests
    await new Promise((r) => setTimeout(r, 200));
  }

  return all.slice(0, limit);
}

async function main() {
  console.log("=== Product Hunt Import ===\n");
  console.log(`Posts per topic: ${POSTS_PER_TOPIC}`);
  console.log(`Auto approve: ${AUTO_APPROVE}`);
  console.log(`Topics to scrape: ${Object.keys(PH_TOPIC_MAP).length}\n`);

  // Load existing data for dedup
  const existingUrls = await getExistingUrls(prisma);
  const existingSlugs = await getExistingSlugs(prisma);
  console.log(`Existing tools in DB: ${existingUrls.size}\n`);

  // Load category map
  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  const topics = Object.keys(PH_TOPIC_MAP);

  for (const topic of topics) {
    const categorySlug = PH_TOPIC_MAP[topic];
    const categoryId = categoryBySlug.get(categorySlug);

    if (!categoryId) {
      console.warn(`  Category "${categorySlug}" not found in DB, skipping topic "${topic}"`);
      continue;
    }

    console.log(`Fetching topic: ${topic} → ${categorySlug}...`);

    let posts: PHPost[];
    try {
      posts = await fetchAllPostsForTopic(topic, POSTS_PER_TOPIC);
    } catch (err) {
      console.error(`  Error fetching topic "${topic}":`, (err as Error).message);
      errors++;
      continue;
    }

    console.log(`  Got ${posts.length} posts`);

    for (const post of posts) {
      const toolUrl = post.website || post.url;
      const normalized = normalizeUrl(toolUrl);

      if (existingUrls.has(normalized)) {
        skipped++;
        continue;
      }

      let slug = generateSlug(post.name);
      slug = deduplicateSlug(slug, existingSlugs);

      try {
        await prisma.tool.create({
          data: {
            name: post.name,
            slug,
            tagline: post.tagline.slice(0, 200),
            description: post.description || post.tagline,
            url: toolUrl,
            iconUrl: getGoogleFaviconUrl(toolUrl),
            categoryId,
            pricing: "FREEMIUM",
            platforms: ["Web"],
            status: AUTO_APPROVE ? "APPROVED" : "PENDING",
            featured: post.votesCount > 1000,
          },
        });

        existingUrls.add(normalized);
        existingSlugs.add(slug);
        imported++;
      } catch (err) {
        console.error(`  Error importing "${post.name}":`, (err as Error).message);
        errors++;
      }
    }
  }

  console.log("\n=== Import Complete ===");
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (duplicate): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
