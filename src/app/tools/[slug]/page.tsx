export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ChevronRight, Star, Triangle } from "lucide-react";
import { ToolAvatar } from "@/components/tool-avatar";
import { prisma } from "@/lib/db";
import { getStackIconKey } from "@/lib/stacks";
import { StackIcon } from "@/components/stack-icon";

interface ToolPageProps {
  params: Promise<{ slug: string }>;
}

async function getTool(slug: string) {
  return prisma.tool.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      category: true,
      tags: { include: { tag: true } },
      stageRecommendations: {
        include: {
          stage: {
            include: { stack: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  });
}

async function getAlternatives(categoryId: string, excludeSlug: string) {
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
    take: 4,
    orderBy: [
      { githubStars: { sort: "desc", nulls: "last" } },
      { phVotes: { sort: "desc", nulls: "last" } },
      { viewCount: "desc" },
    ],
  });
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
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

const pricingLabels: Record<string, string> = {
  FREE: "Free",
  FREEMIUM: "Freemium",
  PAID: "Paid",
  OPEN_SOURCE: "Open Source",
};

const compactNumber = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;
  const tool = await getTool(slug);
  if (!tool) notFound();

  prisma.tool
    .update({ where: { id: tool.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  const alternatives = await getAlternatives(tool.categoryId, tool.slug);

  const stacks = tool.stageRecommendations.map((sr) => ({
    name: sr.stage.stack.name,
    slug: sr.stage.stack.slug,
    stageName: sr.stage.name,
  }));

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pt-5 mb-5">
        <Link href="/tools" className="hover:text-foreground transition-colors">Tools</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{tool.name}</span>
      </nav>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10 pb-16">
        {/* Main content */}
        <div className="min-w-0">
          {/* Tool hero */}
          <div className="flex gap-4 items-start pb-7">
            <ToolAvatar name={tool.name} url={tool.url} iconUrl={tool.iconUrl} className="h-[52px] w-[52px]" />
            <div>
              <h1 className="text-[1.75rem] font-extrabold tracking-[-0.025em]">{tool.name}</h1>
              <p className="text-[0.9375rem] text-muted-foreground mt-1">{tool.tagline}</p>
              <div className="flex gap-1.5 mt-2.5 flex-wrap">
                <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                  {tool.category.name}
                </span>
                {tool.tags.slice(0, 3).map(({ tag }) => (
                  <span key={tag.id} className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* About */}
          {tool.description && (
            <section className="mb-8">
              <h2 className="text-base font-bold tracking-[-0.01em] mb-3 pb-2 border-b border-border">About</h2>
              <p className="text-sm text-secondary-foreground max-w-[60ch] leading-[1.7]">
                {tool.description}
              </p>
            </section>
          )}

          {/* Use Cases */}
          {tool.useCases.length > 0 && (
            <section className="mb-8">
              <h2 className="text-base font-bold tracking-[-0.01em] mb-3 pb-2 border-b border-border">Use Cases</h2>
              <ul className="flex flex-col gap-2">
                {tool.useCases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-secondary-foreground">
                    <span className="w-[5px] h-[5px] rounded-full bg-primary shrink-0 mt-2" />
                    {uc}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Pros & Cons */}
          {(tool.pros.length > 0 || tool.cons.length > 0) && (
            <section className="mb-8">
              <h2 className="text-base font-bold tracking-[-0.01em] mb-3 pb-2 border-b border-border">Pros & Cons</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {tool.pros.length > 0 && (
                  <div>
                    <h4 className="text-[0.8125rem] font-semibold text-emerald-600 dark:text-emerald-400 mb-2.5 flex items-center gap-1.5">Strengths</h4>
                    <ul className="space-y-1.5">
                      {tool.pros.map((p, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[0.8125rem] text-secondary-foreground">
                          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">+</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tool.cons.length > 0 && (
                  <div>
                    <h4 className="text-[0.8125rem] font-semibold text-red-600 dark:text-red-400 mb-2.5 flex items-center gap-1.5">Limitations</h4>
                    <ul className="space-y-1.5">
                      {tool.cons.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[0.8125rem] text-secondary-foreground">
                          <span className="font-bold font-mono text-red-600 dark:text-red-400">-</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Part of these Stacks */}
          {stacks.length > 0 && (
            <section className="mt-7 mb-8">
              <h2 className="text-base font-bold tracking-[-0.01em] mb-3 pb-2 border-b border-border">Part of these Stacks</h2>
              <div className="flex flex-col gap-2">
                {stacks.map((s) => {
                  const iconKey = getStackIconKey(s.slug);
                  return (
                  <Link
                    key={`${s.slug}-${s.stageName}`}
                    href={`/stacks/${s.slug}`}
                    className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3.5 py-3 text-[0.8125rem] transition-colors hover:bg-muted"
                  >
                    {iconKey && <StackIcon icon={iconKey} size="sm" />}
                    <span className="font-semibold">{s.name}</span>
                    <span className="ml-auto text-muted-foreground">{s.stageName} stage</span>
                  </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Divider */}
          <div className="h-px bg-border" />

          {/* Alternatives */}
          {alternatives.length > 0 && (
            <section className="mt-7">
              <h2 className="text-base font-bold tracking-[-0.01em] mb-3 pb-2 border-b border-border">
                Alternatives to {tool.name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {alternatives.map((alt) => (
                  <Link key={alt.slug} href={`/tools/${alt.slug}`} className="group">
                    <article className="flex flex-col gap-2.5 p-4 rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <ToolAvatar name={alt.name} url={alt.url} iconUrl={alt.iconUrl} className="h-10 w-10" />
                      <div>
                        <div className="text-[0.8125rem] font-semibold group-hover:text-primary transition-colors">{alt.name}</div>
                        <div className="text-[0.6875rem] text-muted-foreground mt-0.5 line-clamp-1">{alt.tagline}</div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap mt-auto">
                        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
                          {pricingLabels[alt.pricing] || alt.pricing}
                        </span>
                        {alt.githubStars && (
                          <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
                            <Star className="h-3 w-3" />
                            {compactNumber.format(alt.githubStars)}
                          </span>
                        )}
                        {!alt.githubStars && alt.phVotes && (
                          <span className="inline-flex items-center gap-1 text-[0.6875rem] text-muted-foreground font-mono font-medium">
                            <Triangle className="h-3 w-3" />
                            {compactNumber.format(alt.phVotes)}
                          </span>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 self-start flex flex-col gap-4">
          {/* CTA button */}
          <a
            href={`/api/tools/${tool.slug}/out`}
            className="flex items-center justify-center gap-1.5 w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[0.8125rem] transition-all shadow-sm hover:shadow-md"
          >
            Visit Website
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          {/* At a Glance card */}
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground mb-3.5">
              At a Glance
            </h3>
            <div className="flex flex-col">
              {tool.phVotes != null && (
                <div className="flex justify-between items-center py-2 border-b border-muted text-[0.8125rem]">
                  <span className="text-muted-foreground">PH Votes</span>
                  <span className="font-semibold font-mono text-primary">{compactNumber.format(tool.phVotes)}</span>
                </div>
              )}
              {tool.githubStars != null && (
                <div className="flex justify-between items-center py-2 border-b border-muted text-[0.8125rem]">
                  <span className="text-muted-foreground">GitHub Stars</span>
                  <span className="font-semibold font-mono">{compactNumber.format(tool.githubStars)}</span>
                </div>
              )}
              {!tool.github && !tool.githubStars && (
                <div className="flex justify-between items-center py-2 border-b border-muted text-[0.8125rem]">
                  <span className="text-muted-foreground">GitHub</span>
                  <span className="font-semibold text-muted-foreground">Closed source</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-muted text-[0.8125rem]">
                <span className="text-muted-foreground">Pricing</span>
                <span className="font-semibold font-mono">{pricingLabels[tool.pricing]}</span>
              </div>
              {tool.platforms.length > 0 && (
                <div className="flex justify-between items-center py-2 text-[0.8125rem]">
                  <span className="text-muted-foreground">Platforms</span>
                  <span className="font-semibold font-mono">{tool.platforms.join(", ")}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
