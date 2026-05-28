export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-grid";
import { FeaturedSection } from "@/components/featured-section";
import { CategoryGrid, CategoryIcon } from "@/components/category-nav";
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
      {/* Hero */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 py-16 sm:py-20 lg:py-24">
            <div className="lg:col-span-3">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem] leading-[1.1] text-balance">
                The tools you need,
                <br />
                <span className="text-primary">ready to use.</span>
              </h1>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-lg">
                A curated collection of {totalTools}+ tools.
                Discover the right alternative for your workflow.
              </p>

              <form action="/tools" className="mt-8 max-w-md">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="search"
                    name="q"
                    placeholder="Search by name or use case..."
                    className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-28 text-sm shadow-sm outline-none transition-all duration-200 placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                  />
                  <Button
                    type="submit"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 text-sm transition-all duration-200 active:translate-y-px"
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
                <Link
                  href="/categories"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Categories
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex lg:col-span-2 flex-col justify-center gap-3">
              <div className="grid grid-cols-2 gap-3">
                {categories.slice(0, 6).map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/categories/${cat.slug}`}
                    className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3.5 transition-all duration-200 hover:border-primary/30 hover:shadow-sm"
                  >
                    <CategoryIcon slug={cat.slug} className="h-4.5 w-4.5 text-stone-500 group-hover:text-primary transition-colors shrink-0" />
                    <div className="min-w-0">
                      <span className="text-xs font-semibold truncate block group-hover:text-primary transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                        {cat._count?.tools}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured */}
      {featuredTools.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 lg:px-8 py-14 sm:py-16">
          <FeaturedSection initialTools={featuredTools} />
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="border-y border-border/60 bg-stone-50/50">
          <div className="mx-auto w-full max-w-6xl px-6 lg:px-8 py-14 sm:py-16">
            <div className="flex items-baseline justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Categories</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Browse by what you need
                </p>
              </div>
              <Link href="/categories">
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <CategoryGrid categories={categories} />
          </div>
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
