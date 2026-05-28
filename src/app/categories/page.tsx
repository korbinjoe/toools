export const dynamic = "force-dynamic";

import { CategoryGrid } from "@/components/category-nav";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse tools by category",
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { tools: { where: { status: "APPROVED" } } } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse tools organized by what they help you do
        </p>
      </div>
      <CategoryGrid categories={categories} />
    </div>
  );
}
