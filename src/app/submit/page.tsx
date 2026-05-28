export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { SubmitForm } from "./submit-form";

export const metadata: Metadata = {
  title: "Submit a Tool",
  description: "Submit a tool to be included in the Toools directory.",
};

export default async function SubmitPage() {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-lg px-6 lg:px-8 py-10 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Submit a Tool</h1>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Know a great tool that should be in the collection? Send it our way.
        </p>
      </div>
      <SubmitForm categories={categories} />
    </div>
  );
}
