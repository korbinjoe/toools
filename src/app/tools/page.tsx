export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { SearchBar } from "@/components/search-bar";
import { FilterPanel } from "@/components/filter-panel";
import { ToolGrid } from "@/components/tool-grid";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface ToolsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    pricing?: string;
    embed?: string;
  }>;
}

async function getCategories() {
  return prisma.category.findMany({
    select: { slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

async function getTools(params: {
  q?: string;
  category?: string;
  pricing?: string;
  embed?: string;
}) {
  const where: Prisma.ToolWhereInput = {
    status: "APPROVED",
  };

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { tagline: { contains: params.q, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    where.category = { slug: params.category };
  }

  if (params.pricing) {
    where.pricing = params.pricing as Prisma.EnumPricingFilter["equals"];
  }

  if (params.embed === "embeddable") {
    where.embedMode = { in: ["IFRAME", "API"] };
  }

  return prisma.tool.findMany({
    where,
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
  });
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const params = await searchParams;
  const [tools, categories] = await Promise.all([
    getTools(params),
    getCategories(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Browse Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-mono tabular-nums">{tools.length}</span>
          {" "}tool{tools.length !== 1 ? "s" : ""}
          {params.q && (
            <span> matching <span className="text-foreground font-medium">&ldquo;{params.q}&rdquo;</span></span>
          )}
        </p>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<div className="h-11 rounded-xl animate-shimmer" />}>
          <SearchBar defaultValue={params.q || ""} placeholder="Search tools..." />
        </Suspense>

        <Suspense fallback={<div className="h-20 rounded-xl animate-shimmer" />}>
          <FilterPanel categories={categories} />
        </Suspense>

        <div className="pt-2">
          <ToolGrid tools={tools} />
        </div>
      </div>
    </div>
  );
}
