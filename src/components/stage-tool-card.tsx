import Link from "next/link";
import { Star, Triangle } from "lucide-react";
import { ToolAvatar } from "@/components/tool-avatar";
import type { StackStageTool } from "@/lib/stacks";

const pricingLabels: Record<string, string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  OPEN_SOURCE: "Open Source",
};

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export function StageToolCard({ tool }: { tool: StackStageTool }) {
  const content = (
    <>
      {tool.slug && tool.url ? (
        <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-7 w-7 shrink-0" />
      ) : (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.6875rem] font-bold shrink-0"
          style={{
            background: tool.color,
            color: tool.color === "#FFE01B" ? "#1C1917" : "#fff",
          }}
        >
          {tool.initial}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-[0.8125rem] font-semibold">{tool.name}</div>
        {tool.tagline && (
          <div className="text-[0.6875rem] text-muted-foreground mt-0.5 truncate">{tool.tagline}</div>
        )}
        <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
          {tool.pricing && (
            <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
              {pricingLabels[tool.pricing] ?? tool.pricing}
            </span>
          )}
          {tool.githubStars != null && tool.githubStars > 0 && (
            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
              <Star className="h-3 w-3" />
              {compactNumber.format(tool.githubStars)}
            </span>
          )}
          {(!tool.githubStars || tool.githubStars === 0) && tool.phVotes != null && tool.phVotes > 0 && (
            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
              <Triangle className="h-3 w-3" />
              {compactNumber.format(tool.phVotes)}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const className =
    "flex gap-2.5 p-3.5 rounded-xl border border-border/80 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all";

  if (tool.slug) {
    return (
      <Link href={`/tools/${tool.slug}`} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
