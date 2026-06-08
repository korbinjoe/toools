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
import { normalizePlatforms } from "./lib/platform";
import { fetchGithubStars } from "./lib/github";
import { getUrlIndex } from "./lib/url-index";
import {
  AWESOME_REPOS,
  fetchAwesomeReadme,
  parseAwesomeReadme,
} from "./lib/awesome";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const AUTO_APPROVE = process.env.AWESOME_AUTO_APPROVE === "true";

async function main() {
  console.log("=== GitHub Awesome Lists Import ===\n");
  console.log(`Repos to scan: ${AWESOME_REPOS.length}`);
  console.log(`Auto approve: ${AUTO_APPROVE}\n`);

  const existingUrls = await getExistingUrls(prisma);
  const existingSlugs = await getExistingSlugs(prisma);
  const urlIndex = await getUrlIndex(prisma);
  console.log(`Existing tools in DB: ${existingUrls.size}\n`);

  const categories = await prisma.category.findMany();
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let errors = 0;

  for (const { owner, repo, categoryHint } of AWESOME_REPOS) {
    console.log(`Fetching: ${owner}/${repo}...`);

    let readme: string;
    try {
      readme = await fetchAwesomeReadme(owner, repo);
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
        const toolId = urlIndex.get(normalized);
        if (toolId) {
          try {
            let githubStars: number | null = null;
            if (tool.github) {
              githubStars = await fetchGithubStars(tool.github);
              await new Promise((r) => setTimeout(r, 100));
            }

            await prisma.tool.update({
              where: { id: toolId },
              data: {
                source: "AWESOME_LIST",
                sourceUrl: tool.url,
                ...(tool.github
                  ? {
                      github: tool.github,
                      isOpenSource: true,
                      ...(githubStars != null ? { githubStars } : {}),
                    }
                  : {}),
              },
            });
            updated++;
          } catch {
            errors++;
          }
        } else {
          skipped++;
        }
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
        let githubStars: number | null = null;
        if (tool.github) {
          githubStars = await fetchGithubStars(tool.github);
          await new Promise((r) => setTimeout(r, 100));
        }

        await prisma.tool.create({
          data: {
            name: tool.name.slice(0, 100),
            slug,
            tagline: tool.description.slice(0, 200),
            description: tool.description,
            url: tool.url,
            iconUrl: getGoogleFaviconUrl(tool.url),
            github: tool.github || null,
            githubStars,
            isOpenSource: !!tool.github,
            categoryId,
            pricing: tool.github ? "OPEN_SOURCE" : "FREE",
            platforms: normalizePlatforms(["Web"]),
            status: AUTO_APPROVE ? "APPROVED" : "PENDING",
            source: "AWESOME_LIST",
            sourceUrl: tool.url,
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
  console.log(`  Updated (signals): ${updated}`);
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
