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
