"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { StageToolCard } from "@/components/stage-tool-card";
import type { StackStageRelatedGroup, StackStageTool } from "@/lib/stacks";
import { cn } from "@/lib/utils";

interface StageToolsSectionProps {
  stageId: string;
  tools: StackStageTool[];
  browseCategories: { name: string; slug: string }[];
  relatedGroups: StackStageRelatedGroup[];
}

function ExploreGroup({
  stageId,
  group,
}: {
  stageId: string;
  group: StackStageRelatedGroup;
}) {
  const [expanded, setExpanded] = useState(false);
  const count = group.tools.length;

  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="text-xs font-semibold text-foreground">
          {group.categoryName}
          <span className="ml-1.5 font-normal text-muted-foreground">
            · {count} more {count === 1 ? "tool" : "tools"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 pt-0 border-t border-border/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
            {group.tools.map((tool) => (
              <StageToolCard
                key={`${stageId}-related-${group.categorySlug}-${tool.slug ?? tool.name}`}
                tool={tool}
              />
            ))}
          </div>
          <Link
            href={`/tools?category=${group.categorySlug}`}
            className="inline-block mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Browse all {group.categoryName} tools →
          </Link>
        </div>
      )}
    </div>
  );
}

export function StageToolsSection({
  stageId,
  tools,
  browseCategories,
  relatedGroups,
}: StageToolsSectionProps) {
  const hasExplore = relatedGroups.length > 0 || browseCategories.length > 0;
  const browseOnlyCategories = browseCategories.filter(
    (cat) => !relatedGroups.some((g) => g.categorySlug === cat.slug),
  );

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
        {tools.map((tool) => (
          <StageToolCard key={`${stageId}-${tool.name}`} tool={tool} />
        ))}
      </div>

      {hasExplore && (
        <div className="mt-5 pt-4 border-t border-border/60">
          <p className="text-[0.6875rem] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Explore more
          </p>

          {relatedGroups.length > 0 ? (
            <div className="flex flex-col gap-2">
              {relatedGroups.map((group) => (
                <ExploreGroup key={group.categorySlug} stageId={stageId} group={group} />
              ))}
              {browseOnlyCategories.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  {browseOnlyCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/tools?category=${cat.slug}`}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Browse {cat.name} tools →
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {browseOnlyCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/tools?category=${cat.slug}`}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Browse {cat.name} tools →
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
