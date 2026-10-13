export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Search, Star, Triangle } from "lucide-react";
import { ToolAvatar } from "@/components/tool-avatar";
import { ToolEngagement } from "@/components/tool-engagement";
import { FeaturedDiscovery } from "@/components/featured-discovery";
import { StackIcon } from "@/components/stack-icon";
import { HeroCategoryNav } from "@/components/category-nav";
import { SectionHeader } from "@/components/section-header";
import { stackPreviews } from "@/lib/stacks-data";
import { getDiscoveryIndex, selectHomeDiscovery } from "@/lib/home-discovery";
import { prisma } from "@/lib/db";

const homeToolSelect = {
  slug: true,
  name: true,
  tagline: true,
  url: true,
  iconUrl: true,
  pricing: true,
  viewCount: true,
  clickCount: true,
  featured: true,
  useCases: true,
  createdAt: true,
  githubStars: true,
  phVotes: true,
  category: { select: { name: true, slug: true } },
} as const;

async function getFeaturedTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED", featured: true },
    select: homeToolSelect,
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    take: 24,
  });
}

async function getRecentTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED" },
    select: homeToolSelect,
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    take: 36,
  });
}

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { tools: { where: { status: "APPROVED" } } } },
    },
  });
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const addedDate = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Shanghai",
});
const pricingLabels: Record<string, string> = {
  FREEMIUM: "Freemium",
  FREE: "Free",
  OPEN_SOURCE: "Open Source",
  PAID: "Paid",
};
const workflowSlugs = [
  "indie-developer-toolkit",
  "content-creator-suite",
  "ai-product-builder",
];
const homeWorkflows = workflowSlugs.flatMap((slug) => {
  const stack = stackPreviews.find((stack) => stack.slug === slug);
  return stack ? [stack] : [];
});
const cardLink =
  "group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const card =
  "hover-lift flex h-full flex-col rounded-xl border border-border/80 bg-card p-4 shadow-warm-xs";
const container = "mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8";

export default async function HomePage() {
  const [featuredTools, recentPool, categories] = await Promise.all([
    getFeaturedTools().catch(() => []),
    getRecentTools().catch(() => []),
    getCategories().catch(() => []),
  ]);
  const { recent, discoveries, picks } = selectHomeDiscovery(
    featuredTools,
    recentPool,
  );
  const discoveryIndex = getDiscoveryIndex(discoveries.length);
  const discoveryTools = discoveries.map((tool) => ({
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    url: tool.url,
    iconUrl: tool.iconUrl,
    category: { name: tool.category.name },
    pricing: pricingLabels[tool.pricing],
    useCases: tool.useCases,
    featured: tool.featured,
    viewCount: tool.viewCount,
    clickCount: tool.clickCount,
  }));

  return (
    <div className="flex flex-col">
      <section className="pb-6 pt-7 sm:pb-8 sm:pt-10 lg:pt-12">
        <div className={container}>
          <div
            className={
              "grid items-center gap-6 lg:gap-12 " +
              (discoveries.length > 0
                ? "lg:grid-cols-[1fr_360px]"
                : "grid-cols-1")
            }
          >
            <div className="max-w-[560px]">
              <h1 className="text-balance text-[clamp(1.875rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
                Find the right tools for your entire workflow.
              </h1>
              <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
                Discover tools from{" "}
                <Link href="/how-we-curate#sources" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary">Product Hunt</Link>,{" "}
                <Link href="/how-we-curate#sources" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary">GitHub Awesome lists</Link>, and{" "}
                <Link href="/submit" className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary">our community</Link>.
                {" "}Explore approved listings and workflow picks with visible popularity signals.
              </p>
              <form
                action="/tools"
                role="search"
                className="relative mt-5 max-w-[480px]"
              >
                <label htmlFor="home-search" className="sr-only">
                  Search tools by name or use case
                </label>
                <Search
                  className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="home-search"
                  type="search"
                  name="q"
                  placeholder="Search tools by name or use case..."
                  className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-14 text-sm shadow-warm-xs outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  aria-label="Search tools"
                  className="absolute right-1 top-1 flex h-10 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </form>
              <div className="mt-2 flex flex-wrap gap-x-5 text-xs font-semibold sm:text-[0.8125rem]">
                <Link
                  href="/tools"
                  className="inline-flex min-h-11 items-center gap-1 text-primary hover:underline"
                >
                  Browse all tools{" "}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <Link
                  href="/stacks"
                  className="inline-flex min-h-11 items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  Explore tool stacks{" "}
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
                <Link
                  href="/how-we-curate"
                  className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  How we curate <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
            {discoveryTools.length > 0 && (
              <FeaturedDiscovery
                key={
                  discoveries.map((tool) => tool.slug).join(":") +
                  ":" +
                  discoveryIndex
                }
                tools={discoveryTools}
                initialIndex={discoveryIndex}
              />
            )}
          </div>
        </div>
      </section>

      <section
        className="pb-9 pt-4 sm:pb-12 sm:pt-6"
        aria-labelledby="recent-heading"
      >
        <div className={container}>
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <div>
              <h2
                id="recent-heading"
                className="text-xl font-bold tracking-tight sm:text-[1.375rem]"
              >
                Recently Added
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Fresh finds across the collection
              </p>
            </div>
            <Link
              href="/tools?sort=newest"
              className="shrink-0 text-xs font-semibold text-primary hover:underline sm:text-[0.8125rem]"
            >
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>
          {recent.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((tool) => (
                <Link
                  key={tool.slug}
                  href={"/tools/" + tool.slug}
                  prefetch={false}
                  className={cardLink}
                >
                  <article className={card}>
                    <div className="flex items-start gap-3">
                      <ToolAvatar
                        name={tool.name}
                        url={tool.url}
                        iconUrl={tool.iconUrl}
                        className="h-9 w-9"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold transition-colors group-hover:text-primary">
                          {tool.name}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {tool.tagline}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                        {tool.category.name}
                      </span>
                      <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
                        {pricingLabels[tool.pricing]}
                      </span>
                    </div>
                    <ToolEngagement viewCount={tool.viewCount} clickCount={tool.clickCount} className="mt-3" />
                    <p className="mt-auto pt-3 text-[0.6875rem] text-muted-foreground">
                      Added{" "}
                      <time dateTime={tool.createdAt.toISOString()}>
                        {addedDate.format(tool.createdAt)}
                      </time>
                    </p>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Recent additions are unavailable right now.{" "}
              <Link
                href="/tools"
                className="font-semibold text-primary hover:underline"
              >
                Browse the collection <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-border/60 bg-muted/30 py-8 sm:py-10">
        <div className={container}>
          <SectionHeader
            title="Explore Workflows"
            description="Start with a goal. Find the tools to get there."
            href="/stacks"
            linkLabel="All stacks →"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {homeWorkflows.map((stack) => {
              const names = [
                ...new Set(
                  stack.stages.flatMap((stage) =>
                    stage.tools.map((tool) => tool.name),
                  ),
                ),
              ];
              return (
                <Link
                  key={stack.slug}
                  href={"/stacks/" + stack.slug}
                  className={cardLink}
                >
                  <article className="hover-lift flex h-full flex-col rounded-xl border border-border/80 bg-card p-5 shadow-warm-xs">
                    <div className="flex items-center gap-3">
                      <StackIcon icon={stack.icon} size="sm" />
                      <h3 className="text-sm font-bold tracking-tight transition-colors group-hover:text-primary">
                        {stack.name}
                      </h3>
                    </div>
                    <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted-foreground">
                      {stack.tagline}
                    </p>
                    <p className="mt-3 text-[0.6875rem] text-muted-foreground">
                      For {stack.audience}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                      {names.slice(0, 3).join(" · ")}
                      {names.length > 3 && (
                        <span className="text-muted-foreground">
                          {" "}
                          +{names.length - 3} more
                        </span>
                      )}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-primary">
                      Explore workflow{" "}
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {picks.length > 0 && (
        <section className="py-9 sm:py-12">
          <div className={container}>
            <SectionHeader
              title="Editor's Picks"
              description="More curated tools worth a closer look"
              href="/tools?featured=1"
              linkLabel="All picks →"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {picks.map((tool) => (
                <Link
                  key={tool.slug}
                  href={"/tools/" + tool.slug}
                  prefetch={false}
                  className={cardLink}
                >
                  <article className={card}>
                    <div className="flex items-center gap-2.5">
                      <ToolAvatar
                        name={tool.name}
                        url={tool.url}
                        iconUrl={tool.iconUrl}
                        className="h-8 w-8"
                      />
                      <h3 className="text-sm font-semibold transition-colors group-hover:text-primary">
                        {tool.name}
                      </h3>
                    </div>
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {tool.tagline}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-[0.6875rem]">
                      <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">
                        {pricingLabels[tool.pricing]}
                      </span>
                      {tool.githubStars != null && tool.githubStars > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 font-mono text-muted-foreground"
                          aria-label={tool.githubStars + " GitHub stars"}
                        >
                          <Star className="h-3 w-3" aria-hidden="true" />
                          {compactNumber.format(tool.githubStars)}
                        </span>
                      ) : tool.phVotes != null && tool.phVotes > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 font-mono text-muted-foreground"
                          aria-label={tool.phVotes + " Product Hunt votes"}
                        >
                          <Triangle className="h-3 w-3" aria-hidden="true" />
                          {compactNumber.format(tool.phVotes)}
                        </span>
                      ) : null}
                    </div>
                    <ToolEngagement viewCount={tool.viewCount} clickCount={tool.clickCount} className="mt-3" />
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="border-t border-border/60 py-9 pb-14 sm:py-12 sm:pb-16">
          <div className={container}>
            <HeroCategoryNav categories={categories} variant="plain" />
          </div>
        </section>
      )}
    </div>
  );
}
