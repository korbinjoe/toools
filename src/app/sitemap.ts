import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { buildSitemap } from "@/lib/seo-sitemap";
import { stackPreviews } from "@/lib/stacks-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tools, categories, stacks] = await Promise.all([
    prisma.tool.findMany({
      where: { status: "APPROVED" },
      select: { slug: true },
    }),
    prisma.category.findMany({
      where: { tools: { some: { status: "APPROVED" } } },
      select: { slug: true },
    }),
    prisma.stack.findMany({
      select: { slug: true },
    }),
  ]);

  // Preview-backed stacks are real routes even when they have not been seeded.
  const stackRoutes = [...new Map([...stackPreviews, ...stacks].map((stack) => [stack.slug, { slug: stack.slug }])).values()];
  return buildSitemap(tools, categories, stackRoutes);
}
