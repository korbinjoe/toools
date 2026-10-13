import type { MetadataRoute } from "next";
import { siteUrl } from "./seo";

export function buildSitemap(tools: { slug: string }[], categories: { slug: string }[], stacks: { slug: string }[]): MetadataRoute.Sitemap {
  const staticPaths = ["/", "/stacks", "/tools", "/categories", "/submit", "/about", "/editorial-policy", "/how-we-curate", "/compare/n8n-vs-make-vs-zapier"];
  return [
    ...staticPaths.map((path) => ({ url: siteUrl(path) })),
    ...stacks.map((stack) => ({ url: siteUrl(`/stacks/${stack.slug}`) })),
    ...tools.map((tool) => ({ url: siteUrl(`/tools/${tool.slug}`) })),
    ...categories.map((category) => ({ url: siteUrl(`/categories/${category.slug}`) })),
  ];
}

