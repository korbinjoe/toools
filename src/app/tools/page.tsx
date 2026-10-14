export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { SearchBar } from "@/components/search-bar";
import { FilterPanel } from "@/components/filter-panel";
import { ToolGrid } from "@/components/tool-grid";
import { Pagination } from "@/components/pagination";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { pageMetadata, toolsSearchPolicy, TOOLS_PAGE_SIZE, type ToolsSearchParams } from "@/lib/seo";
import { toolSourceWhere } from "@/lib/tool-sources";

interface ToolsPageProps {
  searchParams: Promise<ToolsSearchParams>;
}

export async function generateMetadata({ searchParams }: ToolsPageProps): Promise<Metadata> {
  const policy = toolsSearchPolicy(await searchParams);
  if (policy.page > 1) {
    const total = await getToolsTotal(JSON.stringify(buildWhere(policy.params)));
    if (policy.page > Math.max(1, Math.ceil(total / TOOLS_PAGE_SIZE))) notFound();
  }
  return pageMetadata(policy.page > 1 ? `Browse Tools — Page ${policy.page}` : "Browse Tools",
    "Search and filter curated tools by source, category, pricing, platform, open-source status, and trust signals.",
    policy.path, { index: policy.index });
}

async function getCategories() {
  return prisma.category.findMany({
    select: { slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
}

function buildWhere(params: {
  q?: string;
  category?: string;
  pricing?: string;
  openSource?: string;
  featured?: string;
  platform?: string;
  source?: string;
}): Prisma.ToolWhereInput {
  const where: Prisma.ToolWhereInput = { status: "APPROVED" };

  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { tagline: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
      { tags: { some: { tag: { name: { contains: params.q, mode: "insensitive" } } } } },
    ];
  }

  if (params.category) {
    where.category = { slug: params.category };
  }

  if (params.pricing) {
    where.pricing = params.pricing as Prisma.EnumPricingFilter["equals"];
  }

  if (params.openSource === "1") {
    where.isOpenSource = true;
  }

  if (params.featured === "1") {
    where.featured = true;
  }

  if (params.platform) {
    where.platforms = { has: params.platform };
  }

  if (params.source) {
    const source = toolSourceWhere(params.source);
    if (source) where.AND = [source];
  }

  return where;
}

function buildOrderBy(sort?: string): Prisma.ToolOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { slug: "asc" }];
    case "clicks":
      return [{ clickCount: "desc" }, { slug: "asc" }];
    default:
      return [{ featured: "desc" }, { viewCount: "desc" }, { slug: "asc" }];
  }
}

async function getTools(
  where: Prisma.ToolWhereInput,
  orderBy: Prisma.ToolOrderByWithRelationInput[],
  page: number,
) {
  const [tools, total] = await Promise.all([
    prisma.tool.findMany({
      where,
      include: {
        category: { select: { name: true, slug: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
      orderBy,
      skip: (page - 1) * TOOLS_PAGE_SIZE,
      take: TOOLS_PAGE_SIZE,
    }),
    getToolsTotal(JSON.stringify(where)),
  ]);

  return { tools, total };
}

const getToolsTotal = cache((serializedWhere: string) =>
  prisma.tool.count({ where: JSON.parse(serializedWhere) as Prisma.ToolWhereInput }),
);

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const { params, page } = toolsSearchPolicy(await searchParams);
  const where = buildWhere(params);
  const orderBy = buildOrderBy(params.sort);

  const [{ tools, total }, categories] = await Promise.all([
    getTools(where, orderBy, page),
    getCategories(),
  ]);

  const totalPages = Math.ceil(total / TOOLS_PAGE_SIZE);
  if (page > Math.max(1, totalPages)) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Browse Tools</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <span className="font-mono tabular-nums">{total}</span>
          {" "}tool{total !== 1 ? "s" : ""}
          {params.q && (
            <span> matching <span className="text-foreground font-medium">&ldquo;{params.q}&rdquo;</span></span>
          )}
        </p>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<div className="h-11 rounded-xl animate-shimmer" />}>
          <SearchBar defaultValue={params.q || ""} placeholder="Search tools..." autoFocus={params.focus === "search"} />
        </Suspense>

        <Suspense fallback={<div className="h-20 rounded-xl animate-shimmer" />}>
          <FilterPanel categories={categories} />
        </Suspense>

        <div className="pt-2">
          <ToolGrid tools={tools} />
          <Pagination currentPage={page} totalPages={totalPages} searchParams={params} />
        </div>
      </div>
    </div>
  );
}
