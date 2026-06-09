import Link from "next/link";
import { ArrowUpRight, Eye, MousePointerClick, Star, Triangle, type LucideIcon } from "lucide-react";
import { ToolAvatar } from "./tool-avatar";
import { ToolSignalBadges } from "./tool-signals";
import type { Pricing } from "@prisma/client";
import type { ToolSignals } from "@/lib/tool-signals";

interface ToolCardProps {
  slug: string;
  name: string;
  tagline: string;
  url: string;
  iconUrl?: string | null;
  category: { name: string; slug: string };
  tags: { name: string }[];
  pricing: Pricing;
  featured?: boolean;
  isOpenSource?: boolean;
  viewCount?: number | null;
  clickCount?: number | null;
  githubStars?: number | null;
  phVotes?: number | null;
}

const pricingConfig: Record<Pricing, { text: string; className: string }> = {
  FREE: { text: "Free", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  FREEMIUM: { text: "Freemium", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  PAID: { text: "Paid", className: "bg-muted text-muted-foreground" },
  OPEN_SOURCE: { text: "Open Source", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
};

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatSignalValue(value: number) {
  return compactNumberFormatter.format(value).replace(".0", "");
}

function MetricSignal({
  icon: Icon,
  label,
  source,
  value,
}: {
  icon: LucideIcon;
  label: string;
  source: string;
  value: number;
}) {
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-muted/70 px-2 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-border/50 transition-colors duration-200 group-hover:bg-muted group-hover:text-foreground"
      title={`${formatSignalValue(value)} ${label}`}
      aria-label={`${formatSignalValue(value)} ${label}`}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="font-semibold leading-none text-foreground/70">{source}</span>
      <span className="font-mono tabular-nums leading-none">{formatSignalValue(value)}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function ToolCard({
  slug,
  name,
  tagline,
  url,
  iconUrl,
  category,
  tags,
  pricing,
  featured = false,
  isOpenSource = false,
  viewCount = 0,
  clickCount = 0,
  githubStars,
  phVotes,
}: ToolCardProps) {
  const p = pricingConfig[pricing];
  const badgeSignals: Pick<ToolSignals, "featured" | "isOpenSource" | "pricing" | "viewCount"> = {
    featured,
    isOpenSource,
    pricing,
    viewCount: viewCount ?? 0,
  };
  const metricSignals = [
    githubStars ? { key: "github", icon: Star, label: "GitHub stars", source: "GH", value: githubStars } : null,
    phVotes ? { key: "product-hunt", icon: Triangle, label: "Product Hunt votes", source: "PH", value: phVotes } : null,
    viewCount ? { key: "views", icon: Eye, label: "views", source: "Views", value: viewCount } : null,
    clickCount ? { key: "clicks", icon: MousePointerClick, label: "clicks", source: "Clicks", value: clickCount } : null,
  ].filter((signal) => signal !== null);

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

        {metricSignals.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            {metricSignals.slice(0, 4).map((signal) => (
              <MetricSignal
                key={signal.key}
                icon={signal.icon}
                label={signal.label}
                source={signal.source}
                value={signal.value}
              />
            ))}
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${p.className}`}>
            {p.text}
          </span>
          <ToolSignalBadges signals={badgeSignals} />
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
