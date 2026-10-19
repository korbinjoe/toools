import { connection } from "next/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbData, pageMetadata } from "@/lib/seo";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-grid";
import { prisma } from "@/lib/db";
import { catalogCache } from "@/lib/catalog-cache";
import { getCatalogCategories, toolCardSelect } from "@/lib/tools";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const getCategory = cache(async (slug: string) => {
  return (await getCatalogCategories()).find((category) => category.slug === slug) ?? null;
});

const getCategoryTools = catalogCache(async (slug: string) => {
  return prisma.tool.findMany({
    where: {
      status: "APPROVED",
      category: { slug },
    },
    select: toolCardSelect,
    orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
  });
}, "category-tools", { metrics: true });

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  return pageMetadata(
    `${category.name} Tools`,
    category.description || `Browse ${category.name} tools and compare options on Toools.`,
    `/categories/${category.slug}`,
    { index: category._count.tools > 0 },
  );
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  await connection();
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const tools = await getCategoryTools(slug);

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12">
      <JsonLd data={breadcrumbData([{ name: "Home", path: "/" }, { name: "Categories", path: "/categories" }, { name: category.name, path: `/categories/${category.slug}` }])} />
      <Link href="/categories">
        <Button variant="ghost" size="sm" className="gap-1.5 mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          All categories
        </Button>
      </Link>

      <div className="mb-6 rounded-xl border border-border/80 bg-accent/30 px-4 py-3 text-sm text-secondary-foreground">
        Want a complete workflow?{" "}
        <Link href="/stacks" className="font-semibold text-primary hover:text-primary/80 transition-colors">
          Browse tool stacks &rarr;
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          {category.icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
              {category.icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                {category.description}
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums">{tools.length}</span> tool{tools.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ToolGrid tools={tools} />
    </div>
  );
}
