import { connection } from "next/server";
import { CategoryGrid } from "@/components/category-nav";
import { loadCatalogCategories } from "@/lib/tools";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Categories",
  "Browse tools by category, or explore curated tool stacks for complete workflows.",
  "/categories",
);

export default async function CategoriesPage() {
  await connection();
  const categories = await loadCatalogCategories();

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12 min-h-[calc(100dvh-8rem)]">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse tools organized by what they help you do
        </p>
      </div>
      {categories.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">No categories to show right now.</p>
      ) : (
        <CategoryGrid categories={categories} />
      )}
    </div>
  );
}
