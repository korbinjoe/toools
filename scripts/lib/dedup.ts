import { PrismaClient } from "@prisma/client";

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "") + u.pathname.replace(/\/$/,  "");
  } catch {
    return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export async function getExistingUrls(prisma: PrismaClient): Promise<Set<string>> {
  const tools = await prisma.tool.findMany({
    select: { url: true },
  });
  return new Set(tools.map((t) => normalizeUrl(t.url)));
}

export async function getExistingSlugs(prisma: PrismaClient): Promise<Set<string>> {
  const tools = await prisma.tool.findMany({
    select: { slug: true },
  });
  return new Set(tools.map((t) => t.slug));
}

export function deduplicateSlug(slug: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(slug)) return slug;
  let i = 2;
  while (existingSlugs.has(`${slug}-${i}`)) i++;
  return `${slug}-${i}`;
}
