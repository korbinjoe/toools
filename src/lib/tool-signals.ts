import type { Pricing, ToolSource } from "@prisma/client";

export type ToolSignals = {
  featured: boolean;
  isOpenSource: boolean;
  pricing: Pricing;
  viewCount: number;
  clickCount: number;
  phVotes?: number | null;
  githubStars?: number | null;
  github?: string | null;
  platforms: string[];
  updatedAt: Date;
  source?: ToolSource | null;
  sourceUrl?: string | null;
};

export function popularityTier(views: number): "hot" | "warm" | null {
  if (views >= 500) return "hot";
  if (views >= 50) return "warm";
  return null;
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function isOpenSourceTool(signals: Pick<ToolSignals, "isOpenSource" | "pricing">) {
  return signals.isOpenSource || signals.pricing === "OPEN_SOURCE";
}

/** Card badge only — pricing badge already says "Open Source" for OPEN_SOURCE pricing. */
export function showOpenSourceBadge(signals: Pick<ToolSignals, "isOpenSource" | "pricing">) {
  return signals.isOpenSource && signals.pricing !== "OPEN_SOURCE";
}

export const toolSignalSelect = {
  featured: true,
  isOpenSource: true,
  pricing: true,
  viewCount: true,
  clickCount: true,
  phVotes: true,
  githubStars: true,
  github: true,
  platforms: true,
  updatedAt: true,
  source: true,
  sourceUrl: true,
} as const;
