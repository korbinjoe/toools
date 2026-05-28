export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolGrid } from "@/components/tool-grid";
import { prisma } from "@/lib/db";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
  });
}

async function getCategoryTools(slug: string) {
  return prisma.tool.findMany({
    where: {
      status: "APPROVED",
      category: { slug },
    },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    orderBy: [{ featured: "desc" }, { viewCount: "desc" }],
  });
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category Not Found" };

  return {
    title: `${category.name} Tools - Toools`,
    description:
      category.description ||
      `Browse the best ${category.name} tools on Toools.`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [category, tools] = await Promise.all([
    getCategory(slug),
    getCategoryTools(slug),
  ]);

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12">
      <Link href="/categories">
        <Button variant="ghost" size="sm" className="gap-1.5 mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          All categories
        </Button>
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-3">
          {category.icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-2xl">
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
