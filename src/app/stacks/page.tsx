import Link from "next/link";
import type { Metadata } from "next";
import { stackPreviews } from "@/lib/stacks-data";
import { StackCard } from "@/components/stack-card";

export const metadata: Metadata = {
  title: "Tool Stacks - Toools",
  description: "Complete tool chains curated for specific roles and workflows. Pick your scenario, get the whole toolkit.",
};

export default function StacksListPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="pt-10 pb-2">
        <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-extrabold tracking-[-0.03em]">
          Tool Stacks
        </h1>
        <p className="text-base text-muted-foreground mt-1.5 max-w-[480px]">
          Complete tool chains curated for specific roles and workflows. Pick your scenario, get the whole toolkit.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-8 pb-16">
        {stackPreviews.map((stack) => (
          <StackCard key={stack.slug} stack={stack} />
        ))}

        {/* Placeholder card */}
        <div className="flex flex-col justify-center p-7 rounded-2xl border border-dashed border-border/80 opacity-50">
          <h3 className="text-muted-foreground font-bold">More stacks coming soon</h3>
          <p className="text-muted-foreground/60 text-sm mt-1.5">
            Have a workflow in mind? Suggest a stack on GitHub.
          </p>
          <div className="mt-4">
            <Link href="/submit" className="text-primary font-semibold text-[0.8125rem] hover:text-primary/80 transition-colors">
              Suggest a stack &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
