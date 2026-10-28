import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { catalogOr } from "@/lib/catalog-fallback";
import { buildSitemap } from "@/lib/seo-sitemap";
import { stackPreviews } from "@/lib/stacks-data";
import { getApprovedToolSlugs, getCatalogCategories } from "@/lib/tools";
import { getCatalogStackSlugs } from "@/lib/stacks";

export async function loadSitemap(): Promise<MetadataRoute.Sitemap> {
  const [tools, categories, stacks] = await Promise.all([
    catalogOr(() => getApprovedToolSlugs(), []),
    catalogOr(() => getCatalogCategories(), []),
    catalogOr(() => getCatalogStackSlugs(), []),
  ]);

  // Preview-backed stacks are real routes even when they have not been seeded.
  const stackRoutes = [...new Map([...stackPreviews, ...stacks.value].map((stack) => [stack.slug, { slug: stack.slug }])).values()];
  return buildSitemap(tools.value, categories.value.filter((category) => category._count.tools > 0), stackRoutes);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  return loadSitemap();
}
