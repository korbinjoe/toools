import type { Prisma, ToolSource } from "@prisma/client";

export const toolSourceOptions = [
  { value: "GITHUB", label: "GitHub" },
  { value: "PRODUCT_HUNT", label: "Product Hunt" },
  { value: "AWESOME_LIST", label: "Awesome Lists" },
  { value: "MANUAL", label: "Curated / Community" },
] as const;

const sourceGroups: Record<string, ToolSource[]> = {
  GITHUB: ["GITHUB_REPOSITORY", "GITHUB_DIRECTORY"],
  GITHUB_REPOSITORY: ["GITHUB_REPOSITORY"],
  GITHUB_DIRECTORY: ["GITHUB_DIRECTORY"],
  PRODUCT_HUNT: ["PRODUCT_HUNT"],
  AWESOME_LIST: ["AWESOME_LIST"],
  MANUAL: ["MANUAL"],
};

export function isToolSourceFilter(value: string) {
  return Object.hasOwn(sourceGroups, value);
}

export function toolSourceWhere(value: string): Prisma.ToolWhereInput | null {
  if (!isToolSourceFilter(value)) return null;
  const sources = sourceGroups[value];
  const alternatives: Prisma.ToolWhereInput[] = [
    { source: { in: sources } },
    { discoveries: { some: { source: { in: sources } } } },
  ];
  // Legacy curated entries predate source tracking.
  if (value === "MANUAL") alternatives.push({ source: null, discoveries: { none: {} } });
  return { OR: alternatives };
}
