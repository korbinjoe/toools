import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { buildSitemap } from "@/lib/seo-sitemap";
import { stackPreviews } from "@/lib/stacks-data";
import { getApprovedToolSlugs, getCatalogCategories } from "@/lib/tools";
import { getCatalogStackSlugs } from "@/lib/stacks";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [tools, categories, stacks] = await Promise.all([
    getApprovedToolSlugs(),
    getCatalogCategories(),
    getCatalogStackSlugs(),
  ]);

  // Preview-backed stacks are real routes even when they have not been seeded.
  const stackRoutes = [...new Map([...stackPreviews, ...stacks].map((stack) => [stack.slug, { slug: stack.slug }])).values()];
  return buildSitemap(tools, categories.filter((category) => category._count.tools > 0), stackRoutes);
}
