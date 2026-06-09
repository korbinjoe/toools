import type { MetadataRoute } from "next";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/database-url";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const adapter = new PrismaPg(getDatabaseUrl());
const prisma = new PrismaClient({ adapter });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tools, categories, stacks] = await Promise.all([
    prisma.tool.findMany({
      where: { status: "APPROVED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      select: { slug: true },
    }),
    prisma.stack.findMany({
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/stacks`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/tools`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/submit`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const stackPages: MetadataRoute.Sitemap = stacks.map((stack) => ({
    url: `${SITE_URL}/stacks/${stack.slug}`,
    lastModified: stack.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const toolPages: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${SITE_URL}/tools/${tool.slug}`,
    lastModified: tool.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${SITE_URL}/categories/${cat.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...stackPages, ...toolPages, ...categoryPages];
}
