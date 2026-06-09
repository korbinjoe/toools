import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { StageToolCard } from "@/components/stage-tool-card";
import { getStackBySlug, stackTags } from "@/lib/stacks";
import { stackPreviews } from "@/lib/stacks-data";
import { StackIcon } from "@/components/stack-icon";

interface StackPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return stackPreviews.map((stack) => ({ slug: stack.slug }));
}

export async function generateMetadata({ params }: StackPageProps): Promise<Metadata> {
  const { slug } = await params;
  const stack = await getStackBySlug(slug);
  if (!stack) return { title: "Stack Not Found" };
  return {
    title: `${stack.name} - Tool Stacks | Toools`,
    description: stack.description,
    openGraph: {
      title: stack.name,
      description: stack.description,
      type: "website",
    },
  };
}

function StackJsonLd({ stack }: { stack: Awaited<ReturnType<typeof getStackBySlug>> }) {
  if (!stack) return null;

  const toolNames = [
    ...new Set(stack.stages.flatMap((stage) => stage.tools.map((t) => t.name))),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: stack.name,
    description: stack.description,
    numberOfItems: toolNames.length,
    itemListElement: toolNames.map((name, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function StackDetailPage({ params }: StackPageProps) {
  const { slug } = await params;
  const stack = await getStackBySlug(slug);
  if (!stack) notFound();

  const tags = stackTags[slug] ?? [];
  const stackMeta = stackPreviews.find((s) => s.slug === slug);

  return (
    <>
      <StackJsonLd stack={stack} />
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pt-5 mb-5">
          <Link href="/stacks" className="hover:text-foreground transition-colors">Stacks</Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{stack.name}</span>
        </nav>

        <div className="pb-8">
          <div className="flex items-start gap-3">
            {stackMeta && <StackIcon icon={stackMeta.icon} size="lg" className="mt-1" />}
            <div>
              <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-extrabold tracking-[-0.03em]">
                {stack.name}
              </h1>
              <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {stack.description}
              </p>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex gap-1.5 mt-3.5 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex border border-border rounded-2xl overflow-hidden bg-card shadow-sm mb-10">
          {stack.stages.map((stage, idx) => (
            <a
              key={stage.id}
              href={`#stage-${idx + 1}`}
              className={`flex-1 py-2.5 px-2 text-center text-[0.6875rem] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer ${idx < stack.stages.length - 1 ? "border-r border-border" : ""}`}
            >
              <span className="block text-[0.5625rem] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
                {String(idx + 1).padStart(2, "0")}
              </span>
              {stage.name.split(" ")[0]}
            </a>
          ))}
        </div>

        <div className="pb-10">
          {stack.stages.map((stage, idx) => (
            <div key={stage.id} id={`stage-${idx + 1}`} className="relative pl-10 mb-10 last:mb-0">
              {idx < stack.stages.length - 1 && (
                <div className="absolute left-[11px] top-8 bottom-[-40px] w-0.5 bg-gradient-to-b from-border to-transparent" />
              )}
              <div className="absolute left-[5px] top-1 w-3.5 h-3.5 rounded-full bg-primary border-[3px] border-accent shadow-[0_0_0_3px_var(--background)]" />

              <div className="text-[0.625rem] font-bold text-primary uppercase tracking-wider font-mono mb-0.5">
                Stage {String(idx + 1).padStart(2, "0")}
              </div>
              <h2 className="text-lg font-bold tracking-[-0.015em]">{stage.name}</h2>
              {stage.description && (
                <p className="text-[0.8125rem] text-muted-foreground mt-0.5">{stage.description}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
                {stage.tools.map((tool) => (
                  <StageToolCard key={`${stage.id}-${tool.name}`} tool={tool} />
                ))}
              </div>

              {stage.editorNote && (
                <div className="mt-3.5 px-3.5 py-2.5 bg-muted/50 border-l-[3px] border-primary rounded-r-lg text-xs text-secondary-foreground leading-relaxed">
                  {stage.editorNote}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center py-6 pb-16">
          <Link href="/stacks">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors"
            >
              Explore more stacks
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}
