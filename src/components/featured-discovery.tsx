"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import { ToolAvatar } from "@/components/tool-avatar";
import { ToolEngagement } from "@/components/tool-engagement";

export interface FeaturedDiscoveryTool {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  iconUrl: string | null;
  category: { name: string };
  pricing: string;
  useCases: string[];
  featured: boolean;
  viewCount: number;
  clickCount: number;
}

export function FeaturedDiscovery({
  tools,
  initialIndex,
}: {
  tools: FeaturedDiscoveryTool[];
  initialIndex: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const tool = tools[index];
  if (!tool) return null;

  return (
    <aside
      aria-label="Tool discovery"
      className="rounded-2xl border border-primary/20 bg-card shadow-warm-md"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {tool.featured ? "Featured Discovery" : "Tool Discovery"}
        </span>
        {tools.length > 1 && (
          <button
            type="button"
            onClick={() => setIndex((current) => (current + 1) % tools.length)}
            className="-my-2 -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Show another tool discovery"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Another pick
          </button>
        )}
      </div>
      <div aria-live="polite" aria-atomic="true">
        <Link
          href={`/tools/${tool.slug}`}
          prefetch={false}
          className="group block rounded-b-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
        >
          <div className="flex items-start gap-3">
            <ToolAvatar
              key={tool.slug}
              name={tool.name}
              url={tool.url}
              iconUrl={tool.iconUrl}
              className="h-10 w-10 sm:h-12 sm:w-12"
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold tracking-tight transition-colors group-hover:text-primary sm:text-lg">
                {tool.name}
              </h2>
              <p className="mt-1 line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                {tool.tagline}
              </p>
            </div>
          </div>
          {tool.useCases[0] && (
            <p className="mt-4 hidden text-xs leading-relaxed text-muted-foreground lg:line-clamp-2">
              <span className="font-semibold text-foreground">Good for: </span>
              {tool.useCases[0]}
            </p>
          )}
          <ToolEngagement viewCount={tool.viewCount} clickCount={tool.clickCount} className="mt-3" />
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.6875rem]">
            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
              {tool.category.name}
            </span>
            <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
              {tool.pricing}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 font-semibold text-primary">
              Explore <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
