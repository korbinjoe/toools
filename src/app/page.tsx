export const dynamic = "force-dynamic";

import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { siteUrl } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, GITHUB_REPO_URL } from "@/lib/site";

export const metadata = { alternates: { canonical: siteUrl() } };
import { ArrowRight, Search } from "lucide-react";
import { stackPreviews } from "@/lib/stacks-data";
import { getEditorialDay } from "@/lib/home-discovery";
import { HomeDiscoverySections } from "@/components/home-discovery-sections";
import { prisma } from "@/lib/db";

const homeToolSelect = {
  slug: true,
  name: true,
  tagline: true,
  url: true,
  iconUrl: true,
  pricing: true,
  viewCount: true,
  clickCount: true,
  createdAt: true,
  githubStars: true,
  phVotes: true,
  category: { select: { name: true, slug: true } },
} as const;

async function getFeaturedTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED", featured: true },
    select: homeToolSelect,
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    take: 24,
  });
}

async function getRecentTools() {
  return prisma.tool.findMany({
    where: { status: "APPROVED" },
    select: homeToolSelect,
    orderBy: [{ createdAt: "desc" }, { slug: "asc" }],
    take: 36,
  });
}

async function getCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { tools: { where: { status: "APPROVED" } } } },
    },
  });
}

function HeroIntro() {
  return (
    <div className="max-w-[560px]">
      <h1 className="text-balance text-[clamp(1.875rem,4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-foreground">
        Find the right tools for your entire workflow.
      </h1>
      <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
        Discover tools from{" "}
        <Link
          href="/how-we-curate#sources"
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
        >
          Product Hunt
        </Link>
        ,{" "}
        <Link
          href="/how-we-curate#sources"
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
        >
          GitHub Awesome lists
        </Link>
        , and{" "}
        <Link
          href="/submit"
          className="font-medium text-foreground underline decoration-border underline-offset-4 hover:text-primary"
        >
          our community
        </Link>
        . Explore approved listings and workflow picks with visible popularity
        signals.
      </p>
      <form
        action="/tools"
        role="search"
        className="relative mt-5 max-w-[480px]"
      >
        <label htmlFor="home-search" className="sr-only">
          Search tools by name or use case
        </label>
        <Search
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="home-search"
          type="search"
          name="q"
          placeholder="Search tools by name or use case..."
          className="h-12 w-full rounded-lg border border-border bg-card pl-10 pr-14 text-sm shadow-warm-xs outline-none transition-all placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          aria-label="Search tools"
          className="absolute right-1 top-1 flex h-10 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-x-5 text-xs font-semibold sm:text-[0.8125rem]">
        <Link
          href="/tools"
          className="inline-flex min-h-11 items-center gap-1 text-primary hover:underline"
        >
          Browse all tools <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <Link
          href="/stacks"
          className="inline-flex min-h-11 items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          Explore tool stacks{" "}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        <Link
          href="/how-we-curate"
          className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          How we curate <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [featuredTools, recentTools, categories] = await Promise.all([
    getFeaturedTools().catch(() => []),
    getRecentTools().catch(() => []),
    getCategories().catch(() => []),
  ]);
  const day = getEditorialDay();
  const serializeTool = (tool: (typeof recentTools)[number]) => ({
    ...tool,
    createdAt: tool.createdAt.toISOString(),
  });
  const workflows = stackPreviews.map((stack) => ({
    slug: stack.slug,
    name: stack.name,
    tagline: stack.tagline,
    audience: stack.audience,
    icon: stack.icon,
    toolNames: [
      ...new Set(
        stack.stages.flatMap((stage) => stage.tools.map((tool) => tool.name)),
      ),
    ],
  }));

  return (
    <div className="flex flex-col">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${siteUrl()}#website`,
              name: SITE_NAME,
              url: siteUrl(),
              description: SITE_DESCRIPTION,
              inLanguage: "en",
              publisher: { "@id": `${siteUrl()}#publisher` },
            },
            {
              "@type": "Organization",
              "@id": `${siteUrl()}#publisher`,
              name: SITE_NAME,
              url: siteUrl(),
              logo: siteUrl("/logo.svg"),
              sameAs: [GITHUB_REPO_URL],
            },
          ],
        }}
      />
      <HomeDiscoverySections
        key={day + ":" + recentTools.map((tool) => tool.slug).join(":")}
        hero={<HeroIntro />}
        recentTools={recentTools.map(serializeTool)}
        featuredTools={featuredTools.map(serializeTool)}
        workflows={workflows}
        categories={categories.map((category) => ({
          slug: category.slug,
          name: category.name,
          count: category._count.tools,
        }))}
        day={day}
      />
    </div>
  );
}
