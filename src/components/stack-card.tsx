import Link from "next/link";
import { Terminal, PenTool, Building, GitBranch } from "lucide-react";
import type { StackPreview } from "@/lib/stacks-data";

const iconMap = {
  terminal: Terminal,
  "pen-tool": PenTool,
  building: Building,
  "git-branch": GitBranch,
};

const iconStyles = {
  terminal: "bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800",
  "pen-tool": "bg-gradient-to-br from-blue-100 to-blue-400 text-blue-800",
  building: "bg-gradient-to-br from-emerald-100 to-emerald-300 text-emerald-800",
  "git-branch": "bg-gradient-to-br from-violet-100 to-violet-300 text-violet-800",
};

export function StackCard({ stack }: { stack: StackPreview }) {
  const Icon = iconMap[stack.icon];
  const iconStyle = iconStyles[stack.icon];

  return (
    <Link href={`/stacks/${stack.slug}`} className="group block">
      <article className="h-full flex flex-col rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-border overflow-hidden">
        {/* Header */}
        <div className="p-5 pb-4 flex gap-3.5 items-start">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-[1.0625rem] leading-tight tracking-tight">{stack.name}</h3>
            <p className="text-[0.8125rem] text-muted-foreground leading-snug mt-1">{stack.tagline}</p>
            <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-muted rounded-full text-[0.6875rem] text-muted-foreground font-medium">
              {stack.audience}
            </span>
          </div>
        </div>

        {/* Flow timeline */}
        <div className="px-5 pb-3 flex-1">
          <div className="flex flex-col">
            {stack.stages.map((stage, idx) => (
              <div key={stage.name} className="flex items-center gap-2.5 py-[7px] relative">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
                {idx === 0 && <div className="absolute left-[7px] top-0 bottom-1/2 w-px bg-transparent" style={{ background: "transparent" }} />}

                {/* Dot */}
                <div className="w-[15px] h-[15px] rounded-full border-2 border-border bg-card flex items-center justify-center text-[7px] font-bold text-muted-foreground relative z-10 shrink-0 group-hover:border-primary transition-colors">
                  {idx + 1}
                </div>

                {/* Stage name */}
                <span className="text-[0.6875rem] font-semibold text-muted-foreground min-w-[52px] shrink-0">
                  {stage.name}
                </span>

                {/* Tool avatars */}
                <div className="flex ml-auto">
                  {stage.tools.map((tool, tIdx) => (
                    <div
                      key={`${tool.name}-${tIdx}`}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[0.5625rem] font-bold text-white border-2 border-card relative"
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

                {/* Tool names */}
                <span className="text-[0.6875rem] text-foreground font-medium ml-1.5 truncate flex-1 min-w-0">
                  {stage.tools.map((t) => t.name).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/50 border-t border-border text-[0.6875rem] text-muted-foreground">
          <div className="flex gap-3">
            <span>{stack.stages.length} stages</span>
            <span>{stack.stages.reduce((sum, s) => sum + s.tools.length, 0)} tools</span>
          </div>
          <span className="text-primary font-semibold text-xs group-hover:text-primary/80 transition-colors">
            Explore stack &rarr;
          </span>
        </div>
      </article>
    </Link>
  );
}
