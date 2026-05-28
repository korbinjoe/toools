/**
 * GitHub Awesome Lists Import Script
 *
 * Usage:
 *   npx tsx scripts/import-awesome-lists.ts
 *
 * Env:
 *   DATABASE_URL - Postgres connection string
 *   GITHUB_TOKEN - (Optional) GitHub personal access token for higher rate limits
 *   AWESOME_AUTO_APPROVE - Set to "true" to mark imports as APPROVED (default: PENDING)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { matchCategory } from "./lib/category-matcher";
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

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const AUTO_APPROVE = process.env.AWESOME_AUTO_APPROVE === "true";

interface AwesomeRepo {
  owner: string;
  repo: string;
  categoryHint?: string;
}

const AWESOME_REPOS: AwesomeRepo[] = [
  { owner: "awesome-selfhosted", repo: "awesome-selfhosted" },
  { owner: "jaywcjlove", repo: "awesome-mac", categoryHint: "productivity" },
  { owner: "goabstract", repo: "Awesome-Design-Tools", categoryHint: "design" },
  { owner: "bradtraversy", repo: "design-resources-for-developers", categoryHint: "design" },
  { owner: "agarrharr", repo: "awesome-cli-apps", categoryHint: "development" },
  { owner: "rothgar", repo: "awesome-tuis", categoryHint: "development" },
  { owner: "analysis-tools-dev", repo: "static-analysis", categoryHint: "development" },
  { owner: "trimstray", repo: "the-book-of-secret-knowledge", categoryHint: "security-privacy" },
  { owner: "kahun", repo: "awesome-sysadmin", categoryHint: "deploy-hosting" },
  { owner: "n1trux", repo: "awesome-sysadmin", categoryHint: "deploy-hosting" },
  { owner: "maguowei", repo: "starred", categoryHint: "development" },
];

interface ParsedTool {
  name: string;
  url: string;
  description: string;
  section: string;
  github?: string;
}

async function fetchReadme(owner: string, repo: string): Promise<string> {
  // Try raw.githubusercontent.com first (no auth needed, no rate limit)
  const branches = ["main", "master"];
  const filenames = ["README.md", "readme.md"];

  for (const branch of branches) {
    for (const filename of filenames) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
      const res = await fetch(rawUrl, {
        headers: { "User-Agent": "toools-importer" },
      });
      if (res.ok) {
        return res.text();
      }
    }
  }

  // Fallback to GitHub API
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "toools-importer",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to fetch README for ${owner}/${repo} (${res.status})`);
  }

  return res.text();
}

function parseAwesomeReadme(content: string): ParsedTool[] {
  const tools: ParsedTool[] = [];
  let currentSection = "";

  const lines = content.split("\n");

  for (const line of lines) {
    // Detect section headings
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim().replace(/[*_`]/g, "");
      continue;
    }

    // Parse list items with links: - [Name](url) - Description
    // Also handles: * [Name](url) — Description
    const itemMatch = line.match(
      /^[\s]*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[-–—:]\s*(.+)/
    );
    if (itemMatch) {
      const [, name, url, description] = itemMatch;

      // Skip anchors, relative links, badges
      if (url.startsWith("#") || url.startsWith("/") || url.includes("shields.io")) {
        continue;
      }

      // Skip non-http links
      if (!url.startsWith("http")) {
        continue;
      }

      const isGithub = url.includes("github.com");

      tools.push({
        name: name.trim(),
        url: url.trim(),
        description: description.trim().replace(/\*\*$/, "").replace(/`/g, ""),
        section: currentSection,
        github: isGithub ? url.trim() : undefined,
      });
      continue;
    }

    // Simpler format: - [Name](url)
    const simpleMatch = line.match(/^[\s]*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*$/);
    if (simpleMatch) {
      const [, name, url] = simpleMatch;
      if (url.startsWith("http") && !url.includes("shields.io")) {
        tools.push({
          name: name.trim(),
          url: url.trim(),
          description: name.trim(),
          section: currentSection,
          github: url.includes("github.com") ? url.trim() : undefined,
        });
      }
    }
  }

  return tools;
}

function inferWebsiteFromGithub(url: string): string | null {
  // For GitHub repos, we still use the github URL as the main url
  // since many awesome-list tools ARE their GitHub repos
  return null;
}

async function main() {
  console.log("=== GitHub Awesome Lists Import ===\n");
  console.log(`Repos to scan: ${AWESOME_REPOS.length}`);
  console.log(`Auto approve: ${AUTO_APPROVE}\n`);

  const existingUrls = await getExistingUrls(prisma);
  const existingSlugs = await getExistingSlugs(prisma);
  console.log(`Existing tools in DB: ${existingUrls.size}\n`);

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const { owner, repo, categoryHint } of AWESOME_REPOS) {
    console.log(`Fetching: ${owner}/${repo}...`);

    let readme: string;
    try {
      readme = await fetchReadme(owner, repo);
    } catch (err) {
      console.error(`  Error: ${(err as Error).message}`);
      errors++;
      // Rate limit: wait before next request
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const parsed = parseAwesomeReadme(readme);
    console.log(`  Parsed ${parsed.length} tool entries`);

    for (const tool of parsed) {
      const normalized = normalizeUrl(tool.url);

      if (existingUrls.has(normalized)) {
        skipped++;
        continue;
      }

      // Determine category
      const hints = [tool.section];
      if (categoryHint) hints.push(categoryHint);
      const categorySlug = matchCategory(hints);
      const categoryId = categoryBySlug.get(categorySlug);

      if (!categoryId) {
        skipped++;
        continue;
      }

      let slug = generateSlug(tool.name);
      slug = deduplicateSlug(slug, existingSlugs);

      try {
        await prisma.tool.create({
          data: {
            name: tool.name.slice(0, 100),
            slug,
            tagline: tool.description.slice(0, 200),
            description: tool.description,
            url: tool.url,
            iconUrl: getGoogleFaviconUrl(tool.url),
            github: tool.github || null,
            isOpenSource: !!tool.github,
            categoryId,
            pricing: tool.github ? "OPEN_SOURCE" : "FREE",
            platforms: ["Web"],
            status: AUTO_APPROVE ? "APPROVED" : "PENDING",
          },
        });

        existingUrls.add(normalized);
        existingSlugs.add(slug);
        imported++;
      } catch (err) {
        errors++;
      }
    }

    // Rate limit between repos
    await new Promise((r) => setTimeout(r, 500));
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
