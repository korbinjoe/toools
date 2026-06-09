import Link from "next/link";
import type { StackListItem } from "@/lib/stacks";

export function StackListCard({ stack }: { stack: StackListItem }) {
  return (
    <Link href={`/stacks/${stack.slug}`} className="group block h-full">
      <article className="hover-lift flex h-full flex-col rounded-2xl border border-border/80 bg-card p-7 shadow-warm-xs">
        <h3 className="font-bold text-lg tracking-[-0.015em]">{stack.name}</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed flex-1">
          {stack.description}
        </p>
        <div className="flex gap-3 mt-3 text-xs text-muted-foreground">
          <span>{stack.stageCount} stages</span>
          <span>{stack.toolCount} tools</span>
        </div>
        <span className="text-primary font-semibold text-[0.8125rem] mt-4 group-hover:text-primary/80 transition-colors">
          Explore this stack &rarr;
        </span>
      </article>
    </Link>
  );
}
