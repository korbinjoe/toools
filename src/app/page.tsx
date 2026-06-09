export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search, ArrowRight, Star, Triangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolAvatar } from "@/components/tool-avatar";
import { StackCard } from "@/components/stack-card";
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

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export default async function HomePage() {
  const [featuredTools, recentTools] = await Promise.all([
    getFeaturedTools().catch(() => []),
    getRecentTools().catch(() => []),
  ]);

  const heroFeatured = featuredTools[0];
  const pickSmall = featuredTools.slice(1, 5);

  return (
    <div className="flex flex-col">
      {/* ===== Hero ===== */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-12 items-center">
            <div>
              <h1 className="text-[clamp(2rem,4.5vw,3.25rem)] font-extrabold tracking-[-0.03em] leading-[1.08] text-foreground">
                Find the right tools<br />for your entire workflow.
              </h1>
              <p className="mt-4 text-[1.0625rem] text-muted-foreground leading-relaxed">
                Curated tool stacks for indie devs, creators, and startups. Stop googling — start building.
              </p>
              <div className="mt-7 flex gap-2.5">
                <Link href="/stacks">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 h-10 rounded-lg text-[0.8125rem]">
                    Browse Stacks
                  </Button>
                </Link>
                <Link href="/tools">
                  <Button variant="outline" className="font-semibold px-5 h-10 rounded-lg text-[0.8125rem]">
                    Search Tools
                  </Button>
                </Link>
              </div>
              <form action="/tools" className="mt-6 relative max-w-[440px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="search"
                  name="q"
                  placeholder="Search tools by name or use case..."
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-border bg-card text-sm shadow-sm outline-none transition-all placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </form>
            </div>

            {/* Hero right: Stack preview card */}
            <div className="hidden lg:block relative bg-card border border-border rounded-2xl p-5 shadow-md">
              <span className="absolute -top-2.5 left-5 bg-primary text-primary-foreground text-[0.6875rem] font-semibold px-2.5 py-0.5 rounded-full">
                Indie Developer Toolkit
              </span>
              {stackPreviews[0].stages.map((stage, idx) => (
                <div key={stage.name} className="flex items-center gap-2.5 py-2 border-b border-muted last:border-b-0 text-[0.8125rem]">
                  <span className="w-5 h-5 rounded-full bg-accent text-primary text-[0.625rem] font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-foreground min-w-[72px]">{stage.name}</span>
                  <span className="text-muted-foreground/60 mx-0.5">&rarr;</span>
                  <span className="text-muted-foreground truncate">
                    {stage.tools.map((t) => t.name).join(", ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Popular Stacks ===== */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-baseline justify-between mb-7">
            <div>
              <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">Popular Stacks</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Complete tool chains for common workflows</p>
            </div>
            <Link href="/stacks" className="text-primary font-semibold text-[0.8125rem] hover:text-primary/80 transition-colors">
              View all stacks &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {stackPreviews.map((stack) => (
              <StackCard key={stack.slug} stack={stack} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== Editor's Picks — 1大+4小不对称布局 ===== */}
      {featuredTools.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-baseline justify-between mb-7">
              <div>
                <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">Editor&apos;s Picks</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Hand-picked tools our editors recommend</p>
              </div>
              <Link href="/tools" className="text-primary font-semibold text-[0.8125rem] hover:text-primary/80 transition-colors">
                View all tools &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: featured big card */}
              {heroFeatured && (
                <Link href={`/tools/${heroFeatured.slug}`} className="group row-span-1 lg:row-span-2">
                  <article className="h-full flex flex-col justify-between p-7 rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                    <div>
                      <ToolAvatar name={heroFeatured.name} url={heroFeatured.url} iconUrl={heroFeatured.iconUrl} className="h-14 w-14" />
                      <h3 className="text-[1.375rem] font-bold mt-5 tracking-[-0.02em] group-hover:text-primary transition-colors">
                        {heroFeatured.name}
                      </h3>
                      <p className="text-[0.9375rem] text-muted-foreground mt-1.5 leading-relaxed">
                        {heroFeatured.tagline}
                      </p>
                    </div>
                    <div className="flex gap-2 mt-5 flex-wrap items-center">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                        {heroFeatured.category.name}
                      </span>
                      {heroFeatured.pricing && (
                        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
                          {heroFeatured.pricing === "FREEMIUM" ? "Freemium" : heroFeatured.pricing === "FREE" ? "Free" : heroFeatured.pricing === "OPEN_SOURCE" ? "Open Source" : "Paid"}
                        </span>
                      )}
                      {heroFeatured.phVotes && (
                        <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
                          <Triangle className="h-3 w-3" />
                          {compactNumber.format(heroFeatured.phVotes)}
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              )}

              {/* Right: small cards column */}
              <div className="flex flex-col gap-4">
                {pickSmall.map((tool) => (
                  <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group">
                    <article className="flex gap-3 p-4 rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-10 w-10" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[0.8125rem] font-semibold group-hover:text-primary transition-colors">{tool.name}</h3>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.tagline}</p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                            {tool.category.name}
                          </span>
                          {tool.githubStars && (
                            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
                              <Star className="h-3 w-3" />
                              {compactNumber.format(tool.githubStars)}
                            </span>
                          )}
                          {!tool.githubStars && tool.phVotes && (
                            <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
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

      {/* ===== Recently Added — 紧凑列表 ===== */}
      {recentTools.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <div className="flex items-baseline justify-between mb-7">
              <div>
                <h2 className="text-[1.375rem] font-bold tracking-[-0.02em]">Recently Added</h2>
                <p className="text-sm text-muted-foreground mt-0.5">The latest tools in our collection</p>
              </div>
              <Link href="/tools" className="text-primary font-semibold text-[0.8125rem] hover:text-primary/80 transition-colors">
                View all &rarr;
              </Link>
            </div>

            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              {recentTools.map((tool, idx) => (
                <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group block">
                  <div className={`flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-muted/50 ${idx < recentTools.length - 1 ? "border-b border-border" : ""}`}>
                    <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-7 w-7" />
                    <span className="text-sm font-semibold">{tool.name}</span>
                    <span className="text-xs text-muted-foreground flex-1 truncate ml-2">{tool.tagline}</span>
                    <div className="flex gap-1.5 shrink-0">
                      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                        {tool.category.name}
                      </span>
                      {tool.pricing === "FREEMIUM" && (
                        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
                          Freemium
                        </span>
                      )}
                      {tool.githubStars && (
                        <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
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
    </div>
  );
}
