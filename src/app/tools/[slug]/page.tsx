export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolEmbed } from "@/components/tool-embed";
import { ToolAvatar } from "@/components/tool-avatar";
import { ToolGrid } from "@/components/tool-grid";
import { prisma } from "@/lib/db";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

async function getTool(slug: string) {
  return prisma.tool.findUnique({
    where: { slug, status: "APPROVED" },
    include: {
      category: true,
      tags: { include: { tag: true } },
    },
  });
}

async function getRelatedTools(categoryId: string, excludeSlug: string) {
  return prisma.tool.findMany({
    where: {
      categoryId,
      status: "APPROVED",
      slug: { not: excludeSlug },
    },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
    take: 3,
    orderBy: { viewCount: "desc" },
  });
}

export async function generateMetadata({
  params,
}: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) return { title: "Tool Not Found" };

  return {
    title: `${tool.name} - Toools`,
    description: tool.tagline,
    openGraph: {
      title: tool.name,
      description: tool.tagline,
      ...(tool.screenshotUrl ? { images: [tool.screenshotUrl] } : {}),
    },
  };
}

const pricingConfig: Record<string, { text: string; className: string }> = {
  FREE: { text: "Free", className: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  FREEMIUM: { text: "Freemium", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  PAID: { text: "Paid", className: "bg-muted text-muted-foreground" },
  OPEN_SOURCE: { text: "Open Source", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
};

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = await getTool(slug);

  if (!tool) notFound();

  prisma.tool
    .update({ where: { id: tool.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const relatedTools = await getRelatedTools(tool.categoryId, tool.slug);

  const p = pricingConfig[tool.pricing];

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-8 sm:py-10">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
        <Link href="/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/categories/${tool.category.slug}`} className="hover:text-foreground transition-colors">{tool.category.name}</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{tool.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex items-start gap-4">
          <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
            <p className="mt-1 text-muted-foreground leading-relaxed">{tool.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Link href={`/categories/${tool.category.slug}`}>
                <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                  {tool.category.name}
                </span>
              </Link>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.className}`}>
                {p.text}
              </span>
              {tool.tags
                .filter(({ tag }) => tag.name.toLowerCase() !== tool.category.name.toLowerCase())
                .map(({ tag }) => (
                <span key={tag.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={tool.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border hover:border-border">
              Visit Website
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </a>
          {tool.github && (
            <a href={tool.github} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border hover:border-border">
                GitHub
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Description */}
      {tool.description && (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mb-8">
          {tool.description}
        </p>
      )}

      {/* Platforms */}
      {tool.platforms.length > 0 && (
        <div className="mb-8 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Platforms
          </span>
          <div className="flex flex-wrap gap-1">
            {tool.platforms.map((platform) => (
              <span key={platform} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Embed */}
      <div className="mb-14 rounded-2xl border border-border/80 overflow-hidden shadow-sm">
        <ToolEmbed
          name={tool.name}
          url={tool.url}
          iconUrl={tool.iconUrl}
          screenshotUrl={tool.screenshotUrl}
        />
      </div>

      {/* Related */}
      {relatedTools.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight">
              More in {tool.category.name}
            </h2>
            <Link href={`/categories/${tool.category.slug}`}>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
                See all
              </Button>
            </Link>
          </div>
          <ToolGrid tools={relatedTools} />
        </section>
      )}
    </div>
  );
}
