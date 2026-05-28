export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Zap } from "lucide-react";
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
  FREE: { text: "Free", className: "bg-emerald-50 text-emerald-700" },
  FREEMIUM: { text: "Freemium", className: "bg-amber-50 text-amber-700" },
  PAID: { text: "Paid", className: "bg-stone-100 text-stone-600" },
  OPEN_SOURCE: { text: "Open Source", className: "bg-sky-50 text-sky-700" },
};

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = await getTool(slug);

  if (!tool) notFound();

  prisma.tool
    .update({ where: { id: tool.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const relatedTools = await getRelatedTools(tool.categoryId, tool.slug);

  const embedConfig = tool.embedConfig as {
    height?: string;
    sandbox?: string;
    allow?: string;
  } | null;

  const p = pricingConfig[tool.pricing];
  const canEmbed = tool.embedMode !== "EXTERNAL";

  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-8 sm:py-10">
      <Link href="/tools">
        <Button variant="ghost" size="sm" className="gap-1.5 mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div className="flex items-start gap-4">
          <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-14 w-14" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight">{tool.name}</h1>
              {canEmbed && (
                <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <Zap className="h-3 w-3" />
                  Embeddable
                </span>
              )}
            </div>
            <p className="mt-1 text-muted-foreground leading-relaxed">{tool.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Link href={`/categories/${tool.category.slug}`}>
                <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 hover:bg-stone-200 transition-colors">
                  {tool.category.name}
                </span>
              </Link>
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${p.className}`}>
                {p.text}
              </span>
              {tool.tags.map(({ tag }) => (
                <span key={tag.id} className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a href={tool.url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border hover:border-stone-300">
              Visit Website
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </a>
          {tool.github && (
            <a href={tool.github} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-border hover:border-stone-300">
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
              <span key={platform} className="inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-500">
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
          embedMode={tool.embedMode}
          embedUrl={tool.embedUrl}
          embedConfig={embedConfig}
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
