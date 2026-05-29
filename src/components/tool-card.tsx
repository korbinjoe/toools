import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ToolAvatar } from "./tool-avatar";
import type { Pricing } from "@prisma/client";

interface ToolCardProps {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  iconUrl?: string | null;
  category: { name: string; slug: string };
  tags: { name: string }[];
  pricing: Pricing;
}

const pricingConfig: Record<Pricing, { text: string; className: string }> = {
  FREE: { text: "Free", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  FREEMIUM: { text: "Freemium", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  PAID: { text: "Paid", className: "bg-muted text-muted-foreground" },
  OPEN_SOURCE: { text: "Open Source", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
};

export function ToolCard({
  slug,
  name,
  tagline,
  url,
  iconUrl,
  category,
  tags,
  pricing,
}: ToolCardProps) {
  const p = pricingConfig[pricing];

  return (
    <Link href={`/tools/${slug}`} className="group block h-full">
      <article className="relative h-full flex flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border hover:-translate-y-0.5">
        <div className="flex items-start gap-3.5">
          <ToolAvatar name={name} url={url} iconUrl={iconUrl} className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[15px] leading-tight truncate group-hover:text-primary transition-colors duration-200">
              {name}
            </h3>
            <span className="text-xs text-muted-foreground">
              {category.name}
            </span>
          </div>
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary shrink-0 mt-0.5 transition-colors duration-200" />
        </div>

        <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {tagline}
        </p>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${p.className}`}>
            {p.text}
          </span>
          {tags.slice(0, 2).map((tag) => (
            <span
              key={tag.name}
              className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {tag.name}
            </span>
          ))}
        </div>
      </article>
    </Link>
  );
}
