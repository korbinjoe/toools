import type { PrismaClient } from "@prisma/client";
import { normalizeUrl } from "./dedup";

export async function getUrlIndex(
  prisma: PrismaClient,
): Promise<Map<string, string>> {
  const tools = await prisma.tool.findMany({
    select: { id: true, url: true },
  });
  const map = new Map<string, string>();
  for (const tool of tools) {
    map.set(normalizeUrl(tool.url), tool.id);
  }
  return map;
}
