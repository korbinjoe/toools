export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search, Star, Triangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolAvatar } from "@/components/tool-avatar";
import { StackCard } from "@/components/stack-card";
import { HeroCategoryNav } from "@/components/category-nav";
import { SectionHeader } from "@/components/section-header";
import { stackPreviews } from "@/lib/stacks-data";
import { prisma } from "@/lib/db";

async function getFeaturedTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED", featured: true },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [
      { githubStars: { sort: "desc", nulls: "last" } },
      { phVotes: { sort: "desc", nulls: "last" } },
      { viewCount: "desc" },
    ],
    take: 5,
  });
}

async function getRecentTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED" },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    take: 4,
    orderBy: { createdAt: "desc" },
  });
}

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { tools: { where: { status: "APPROVED" } } } } },
  });
}

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

const pricingLabel = (pricing: string) =>
  pricing === "FREEMIUM"
    ? "Freemium"
    : pricing === "FREE"
      ? "Free"
      : pricing === "OPEN_SOURCE"
        ? "Open Source"
        : "Paid";

export default async function HomePage() {
  const [featuredTools, recentTools, categories] = await Promise.all([
    getFeaturedTools().catch(() => []),
    getRecentTools().catch(() => []),
    getCategories().catch(() => []),
  ]);

  const heroFeatured = featuredTools[0];
  const pickSmall = featuredTools.slice(1, 5);
  const heroStack = stackPreviews[0];

  return (
    <div className="flex flex-col">
      <section className="pt-10 pb-12 sm:pt-14 sm:pb-16 lg:pt-16 lg:pb-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_380px] lg:gap-12">
            <div className="max-w-[560px]">
              <h1 className="text-balance text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
                Find the right tools for your entire workflow.
              </h1>
              <p className="mt-4 max-w-[48ch] text-[1.0625rem] leading-relaxed text-muted-foreground">
                Curated tool stacks for indie devs, creators, and startups.
              </p>
              <div className="mt-7 flex flex-wrap gap-2.5">
                <Link href="/stacks">
                  <Button className="h-10 rounded-lg px-5 text-[0.8125rem] font-semibold">
                    Browse Stacks
                  </Button>
                </Link>
                <Link href="/tools">
                  <Button variant="outline" className="h-10 rounded-lg px-5 text-[0.8125rem] font-semibold">
                    Search Tools
                  </Button>
                </Link>
              </div>
              <form action="/tools" className="relative mt-6 max-w-[440px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search tools by name or use case..."
                  className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-4 text-sm shadow-warm-xs outline-none transition-all placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                />
              </form>
            </div>

            <Link
              href={`/stacks/${heroStack.slug}`}
              className="group hidden lg:block hover-lift"
            >
              <div className="relative rounded-2xl border border-border bg-card p-5 shadow-warm-md">
                <span className="absolute -top-2.5 left-5 rounded-full bg-primary px-2.5 py-0.5 text-[0.6875rem] font-semibold text-primary-foreground">
                  {heroStack.name}
                </span>
                {heroStack.stages.map((stage, idx) => (
                  <div
                    key={stage.name}
                    className="flex items-center gap-2.5 border-b border-muted py-2 text-[0.8125rem] last:border-b-0"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[0.625rem] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <span className="min-w-[72px] font-semibold text-foreground">{stage.name}</span>
                    <span className="mx-0.5 text-muted-foreground/60" aria-hidden="true">&rarr;</span>
                    <span className="truncate text-muted-foreground">
                      {stage.tools.map((t) => t.name).join(", ")}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Popular Stacks"
            description="Complete tool chains for common workflows"
            href="/stacks"
            linkLabel="View all stacks →"
          />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {stackPreviews.map((stack) => (
              <StackCard key={stack.slug} stack={stack} />
            ))}
          </div>
        </div>
      </section>

      {featuredTools.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Editor's Picks"
              description="Hand-picked tools our editors recommend"
              href="/tools"
              linkLabel="View all tools →"
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {heroFeatured && (
                <Link href={`/tools/${heroFeatured.slug}`} className="group row-span-1 lg:row-span-2">
                  <article className="hover-lift flex h-full flex-col justify-between rounded-2xl border border-border/80 bg-card p-7 shadow-warm-xs">
                    <div>
                      <ToolAvatar name={heroFeatured.name} url={heroFeatured.url} iconUrl={heroFeatured.iconUrl} className="h-14 w-14" />
                      <h3 className="mt-5 text-[1.375rem] font-bold tracking-[-0.02em] transition-colors group-hover:text-primary">
                        {heroFeatured.name}
                      </h3>
                      <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
                        {heroFeatured.tagline}
                      </p>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                        {heroFeatured.category.name}
                      </span>
                      {heroFeatured.pricing && (
                        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
                          {pricingLabel(heroFeatured.pricing)}
                        </span>
                      )}
                      {heroFeatured.phVotes != null && heroFeatured.phVotes > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-medium text-muted-foreground">
                          <Triangle className="h-3 w-3" />
                          {compactNumber.format(heroFeatured.phVotes)}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              )}

              <div className="flex flex-col gap-4">
                {pickSmall.map((tool) => (
                  <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group">
                    <article className="hover-lift flex gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-warm-xs">
                      <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-10 w-10" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[0.8125rem] font-semibold transition-colors group-hover:text-primary">{tool.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{tool.tagline}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                            {tool.category.name}
                          </span>
                          {tool.githubStars != null && tool.githubStars > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-medium text-muted-foreground">
                              <Star className="h-3 w-3" />
                              {compactNumber.format(tool.githubStars)}
                            </span>
                          )}
                          {(!tool.githubStars || tool.githubStars === 0) && tool.phVotes != null && tool.phVotes > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-medium text-muted-foreground">
                              <Triangle className="h-3 w-3" />
                              {compactNumber.format(tool.phVotes)}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {recentTools.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <SectionHeader
              title="Recently Added"
              description="The latest tools in our collection"
              href="/tools"
              linkLabel="View all →"
            />

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-warm-xs">
              {recentTools.map((tool, idx) => (
                <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group block">
                  <div
                    className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-muted/50 ${idx < recentTools.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-7 w-7" />
                    <span className="text-sm font-semibold">{tool.name}</span>
                    <span className="ml-2 flex-1 truncate text-xs text-muted-foreground">{tool.tagline}</span>
                    <div className="flex shrink-0 gap-1.5">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                        {tool.category.name}
                      </span>
                      {tool.pricing === "FREEMIUM" && (
                        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
                          Freemium
                        </span>
                      )}
                      {tool.githubStars != null && tool.githubStars > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] font-medium text-muted-foreground">
                          <Star className="h-3 w-3" />
                          {compactNumber.format(tool.githubStars)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {categories.length > 0 && (
        <section className="border-t border-border/60 py-12 sm:py-16 pb-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <HeroCategoryNav categories={categories} variant="plain" />
          </div>
        </section>
      )}
    </div>
  );
}
