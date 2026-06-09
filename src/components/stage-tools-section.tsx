"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { StageToolCard } from "@/components/stage-tool-card";
import type { StackStageTool } from "@/lib/stacks";
import { cn } from "@/lib/utils";

interface StageToolsSectionProps {
  stageId: string;
  tools: StackStageTool[];
  relatedTools: StackStageTool[];
  relatedLabel: string | null;
  relatedCategorySlug: string | null;
}

export function StageToolsSection({
  stageId,
  tools,
  relatedTools,
  relatedLabel,
  relatedCategorySlug,
}: StageToolsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const hasRelated = relatedTools.length > 0;

  const moreLabel = relatedLabel
    ? `View more ${relatedLabel} tools`
    : "View more similar tools";

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
        {tools.map((tool) => (
          <StageToolCard key={`${stageId}-${tool.name}`} tool={tool} />
        ))}
        {expanded &&
          relatedTools.map((tool) => (
            <StageToolCard key={`${stageId}-related-${tool.slug ?? tool.name}`} tool={tool} />
          ))}
      </div>

      {hasRelated && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? "Show less" : moreLabel}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
            />
          </button>
          {!expanded && relatedCategorySlug && relatedLabel && (
            <Link
              href={`/tools?category=${relatedCategorySlug}`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Browse all {relatedLabel} tools →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
