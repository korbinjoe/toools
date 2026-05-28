import { ToolCard } from "./tool-card";
import type { EmbedMode, Pricing } from "@prisma/client";

export interface ToolItem {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  iconUrl?: string | null;
  category: { name: string; slug: string };
  tags: { tag: { name: string } }[];
  pricing: Pricing;
  embedMode: EmbedMode;
}

export function ToolGrid({ tools }: { tools: ToolItem[] }) {
  if (tools.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 text-2xl mb-4">
          ?
        </div>
        <p className="text-muted-foreground text-sm">No tools match your filters.</p>
        <p className="text-muted-foreground/60 text-xs mt-1">Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tools.map((tool, i) => (
        <div
          key={tool.slug}
          className="animate-fade-in-up"
          style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
        >
          <ToolCard
            slug={tool.slug}
            name={tool.name}
            tagline={tool.tagline}
            url={tool.url}
            iconUrl={tool.iconUrl}
            category={tool.category}
            tags={tool.tags.map((t) => ({ name: t.tag.name }))}
            pricing={tool.pricing}
            embedMode={tool.embedMode}
          />
        </div>
      ))}
    </div>
  );
}
