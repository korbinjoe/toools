import Link from "next/link";
import { StackIcon } from "@/components/stack-icon";
import type { StackPreview } from "@/lib/stacks-data";

export function StackCard({ stack }: { stack: StackPreview }) {
  return (
    <Link href={`/stacks/${stack.slug}`} className="group block">
      <article className="hover-lift flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-warm-xs">
        <div className="flex items-start gap-3.5 p-5 pb-4">
          <StackIcon icon={stack.icon} size="md" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[1.0625rem] font-bold leading-tight tracking-tight">{stack.name}</h3>
            <p className="mt-1 text-[0.8125rem] leading-snug text-muted-foreground">{stack.tagline}</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
              {stack.audience}
            </span>
          </div>
        </div>

        <div className="flex-1 px-5 pb-3">
          {stack.stages.map((stage, idx) => (
            <div key={stage.name} className="relative flex items-center gap-2.5 py-[7px]">
              <div
                className="absolute left-[7px] w-px bg-border"
                style={{
                  top: idx === 0 ? "50%" : 0,
                  bottom: idx === stack.stages.length - 1 ? "50%" : 0,
                }}
              />
              <div className="relative z-10 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-[7px] font-bold text-muted-foreground transition-colors group-hover:border-primary">
                {idx + 1}
              </div>
              <span className="min-w-[52px] shrink-0 text-[0.6875rem] font-semibold text-muted-foreground">
                {stage.name}
              </span>
              <div className="ml-auto flex">
                {stage.tools.map((tool, tIdx) => (
                  <div
                    key={`${tool.name}-${tIdx}`}
                    className="relative flex h-6 w-6 items-center justify-center rounded-md border-2 border-card text-[0.5625rem] font-bold text-white"
                    style={{
                      background: tool.color,
                      marginLeft: tIdx > 0 ? "-2px" : "0",
                      color: tool.color === "#FFE01B" ? "#1C1917" : "#fff",
                    }}
                    title={tool.name}
                  >
                    {tool.initial}
                  </div>
                ))}
              </div>
              <span className="ml-1.5 min-w-0 flex-1 truncate text-[0.6875rem] font-medium text-foreground">
                {stage.tools.map((t) => t.name).join(", ")}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-muted/50 px-5 py-3 text-[0.6875rem] text-muted-foreground">
          <div className="flex gap-3">
            <span>{stack.stages.length} stages</span>
            <span>{stack.stages.reduce((sum, s) => sum + s.tools.length, 0)} tools</span>
          </div>
          <span className="text-xs font-semibold text-primary transition-colors group-hover:text-primary/80">
            Explore stack &rarr;
          </span>
        </div>
      </article>
    </Link>
  );
}
