import Link from "next/link";
import {
  Bot,
  Palette,
  Code2,
  PenLine,
  ImageIcon,
  Film,
  TrendingUp,
  BarChart3,
  Zap,
  Rocket,
  Shield,
  MessageSquare,
  Briefcase,
  FolderOpen,
  GraduationCap,
  Wrench,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = {
  "ai-assistants": Bot,
  design: Palette,
  development: Code2,
  "writing-notes": PenLine,
  "image-media": ImageIcon,
  "video-audio": Film,
  "seo-marketing": TrendingUp,
  "data-analytics": BarChart3,
  productivity: Zap,
  "deploy-hosting": Rocket,
  "security-privacy": Shield,
  communication: MessageSquare,
  business: Briefcase,
  automation: Workflow,
  "file-management": FolderOpen,
  education: GraduationCap,
  utilities: Wrench,
};

interface CategoryItem {
  slug: string;
  name: string;
  icon?: string | null;
  _count?: { tools: number };
}

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = categoryIcons[slug];
  if (!Icon) return null;
  return <Icon className={className} />;
}

export function HeroCategoryNav({ categories }: { categories: CategoryItem[] }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/30 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Explore categories
        </p>
        <Link
          href="/categories"
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const Icon = categoryIcons[cat.slug] || Bot;
          return (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-xs font-medium whitespace-nowrap shadow-sm transition-all duration-200 hover:border-primary/35 hover:bg-background hover:shadow-md"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-primary" />
              <span className="text-foreground/90 transition-colors duration-200 group-hover:text-primary">
                {cat.name}
              </span>
              {cat._count != null && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground">
                  {cat._count.tools}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CategoryGrid({ categories }: { categories: CategoryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((cat, i) => {
        const Icon = categoryIcons[cat.slug] || Bot;
        return (
          <Link
            key={cat.slug}
            href={`/categories/${cat.slug}`}
            className="group animate-fade-in-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-center gap-3 rounded-xl border border-border/80 bg-card p-4 transition-all duration-200 hover:bg-accent/40 hover:border-primary/30 hover:shadow-[0_2px_8px_rgba(217,119,6,0.06)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0 transition-transform duration-200 group-hover:scale-105">
                <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors duration-200">
                  {cat.name}
                </h3>
                {cat._count && (
                  <span className="text-xs text-muted-foreground font-mono tabular-nums">
                    {cat._count.tools} tools
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
