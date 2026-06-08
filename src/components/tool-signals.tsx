import { Flame, Star, TrendingUp } from "lucide-react";
import type { ToolSignals } from "@/lib/tool-signals";
import {
  formatCount,
  isOpenSourceTool,
  popularityTier,
  showOpenSourceBadge,
} from "@/lib/tool-signals";
import { LocalDateTime } from "@/components/local-date-time";
import { cn } from "@/lib/utils";

function SignalBadge({
  className,
  children,
}: {
  className: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function ToolSignalBadges({
  signals,
}: {
  signals: Pick<ToolSignals, "featured" | "isOpenSource" | "pricing" | "viewCount">;
}) {
  const tier = popularityTier(signals.viewCount);

  return (
    <>
      {signals.featured && (
        <SignalBadge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          <Star className="h-3 w-3 fill-current" />
          Featured
        </SignalBadge>
      )}
      {showOpenSourceBadge(signals) && (
        <SignalBadge className="bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
          Open Source
        </SignalBadge>
      )}
      {tier === "hot" && (
        <SignalBadge className="bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
          <Flame className="h-3 w-3" />
          Popular
        </SignalBadge>
      )}
      {tier === "warm" && (
        <SignalBadge className="bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400">
          <TrendingUp className="h-3 w-3" />
          Trending
        </SignalBadge>
      )}
    </>
  );
}

const pricingLabels: Record<ToolSignals["pricing"], string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  OPEN_SOURCE: "Open Source",
};

const sourceLabels: Record<NonNullable<ToolSignals["source"]>, string> = {
  MANUAL: "Manual submission",
  PRODUCT_HUNT: "Product Hunt",
  AWESOME_LIST: "Awesome List",
};

function GlanceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <div className="text-xs text-foreground text-right">{children}</div>
    </div>
  );
}

export function ToolAtAGlance({ signals }: { signals: ToolSignals }) {
  const openSource = isOpenSourceTool(signals);
  const embedLabel =
    signals.embedMode === "IFRAME" || signals.embedMode === "API"
      ? "Try in-site"
      : "External only";

  return (
    <section className="mb-8 rounded-2xl border border-border/80 bg-muted/30 p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
        At a Glance
      </h2>
      <div>
        <GlanceRow label="Pricing">{pricingLabels[signals.pricing]}</GlanceRow>

        {signals.platforms.length > 0 && (
          <GlanceRow label="Platforms">
            {signals.platforms.join(" · ")}
          </GlanceRow>
        )}

        {openSource && (
          <GlanceRow label="Open Source">
            {signals.githubStars && signals.githubStars > 0 && signals.github ? (
              <a
                href={signals.github}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {formatCount(signals.githubStars)} stars
              </a>
            ) : (
              "Yes"
            )}
          </GlanceRow>
        )}

        {(signals.viewCount > 0 || signals.clickCount > 0) && (
          <GlanceRow label="Popularity">
            <span className="tabular-nums">
              {signals.viewCount > 0 && `${formatCount(signals.viewCount)} views`}
              {signals.viewCount > 0 && signals.clickCount > 0 && " · "}
              {signals.clickCount > 0 && `${formatCount(signals.clickCount)} clicks`}
            </span>
          </GlanceRow>
        )}

        {signals.phVotes != null && signals.phVotes > 0 && (
          <GlanceRow label="Product Hunt">
            {signals.sourceUrl ? (
              <a
                href={signals.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors tabular-nums"
              >
                {formatCount(signals.phVotes)} votes
              </a>
            ) : (
              <span className="tabular-nums">{formatCount(signals.phVotes)} votes</span>
            )}
          </GlanceRow>
        )}

        <GlanceRow label="Try in-site">{embedLabel}</GlanceRow>

        <GlanceRow label="Last updated">
          <LocalDateTime iso={signals.updatedAt.toISOString()} />
        </GlanceRow>

        {signals.source && signals.source !== "MANUAL" && (
          <GlanceRow label="Source">
            {signals.sourceUrl ? (
              <a
                href={signals.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {sourceLabels[signals.source]}
              </a>
            ) : (
              sourceLabels[signals.source]
            )}
          </GlanceRow>
        )}
      </div>
    </section>
  );
}
