export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-grid";
import { FeaturedSection } from "@/components/featured-section";
import { HeroCategoryNav } from "@/components/category-nav";
import { prisma } from "@/lib/db";

async function getFeaturedTools() {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Tool" WHERE status = 'APPROVED' ORDER BY RANDOM() LIMIT 6`
  );
  if (rows.length === 0) return [];
  return prisma.tool.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });
}

async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { tools: { where: { status: "APPROVED" } } } } },
    orderBy: { sortOrder: "asc" },
  });
}

async function getRecentTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED" },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    take: 6,
    orderBy: { createdAt: "desc" },
  });
}

export default async function HomePage() {
  const [featuredTools, categories, recentTools] =
    await Promise.all([
      getFeaturedTools(),
      getCategories(),
      getRecentTools(),
    ]);

  const totalTools = categories.reduce(
    (sum, cat) => sum + (cat._count?.tools || 0),
    0
  );

  return (
    <div className="flex flex-col">
      {/* Hero — capped height so Featured peeks below the fold on desktop */}
      <section className="border-b border-border/60 flex items-center lg:max-h-[calc(100dvh-3.5rem-12rem)]">
        <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12 lg:py-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 xl:gap-16 lg:items-center">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] leading-[1.08] text-balance">
                The tools you need,
                <br />
                <span className="text-primary">ready to use.</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
                A curated collection of {totalTools}+ tools.
                Discover the right alternative for your workflow.
              </p>

              <form action="/tools" className="mt-7 max-w-md">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="search"
                    name="q"
                    placeholder="Search by name or use case..."
                    className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-28 text-sm shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                  <Button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-8 px-3.5 text-sm transition-all duration-200 active:translate-y-px"
                  >
                    Search
                  </Button>
                </div>
              </form>

              <div className="mt-6 flex items-center gap-6 text-sm">
                <Link
                  href="/tools"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse all
                </Link>
              </div>
            </div>

            {categories.length > 0 && (
              <HeroCategoryNav categories={categories} />
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featuredTools.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 lg:px-8 pt-6 pb-14 sm:pb-16">
          <FeaturedSection initialTools={featuredTools} />
        </section>
      )}

      {/* Recent */}
      {recentTools.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 lg:px-8 py-14 sm:py-16">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recently Added</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Fresh additions to the collection
              </p>
            </div>
            <Link href="/tools">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
          <ToolGrid tools={recentTools} />
        </section>
      )}
    </div>
  );
}
