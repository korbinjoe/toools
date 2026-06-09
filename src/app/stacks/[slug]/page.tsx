import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { stackPreviews } from "@/lib/stacks-data";

interface StackPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StackPageProps): Promise<Metadata> {
  const { slug } = await params;
  const stack = stackPreviews.find((s) => s.slug === slug);
  if (!stack) return { title: "Stack Not Found" };
  return {
    title: `${stack.name} - Tool Stacks | Toools`,
    description: stack.description,
  };
}

export default async function StackDetailPage({ params }: StackPageProps) {
  const { slug } = await params;
  const stack = stackPreviews.find((s) => s.slug === slug);
  if (!stack) notFound();

  const editorNotes: Record<string, Record<string, string>> = {
    "indie-developer-toolkit": {
      "Research": "Use Perplexity for rapid market research, Notion to organize findings, and Excalidraw to sketch initial concepts.",
      "Design": "Figma is the industry standard for UI. Canva for quick marketing graphics. Excalidraw for architecture diagrams.",
      "Dev": "Cursor supercharges coding with AI. VS Code is the reliable fallback. GitHub is non-negotiable for version control.",
      "Deploy": "Vercel for your Next.js frontend, Railway for backend services, Supabase for database and auth — the modern indie stack.",
      "Analytics": "PostHog is all-in-one for product analytics. Sentry catches errors before users report them. Plausible is the ethical pick.",
      "Launch": "Launch on Product Hunt for day-one visibility. Build your email list early with Mailchimp. Buffer keeps your social consistent.",
    },
    "content-creator-suite": {
      "Writing": "Notion for organizing your content calendar. ChatGPT for brainstorming and drafts. Hemingway for punchy, readable prose.",
      "Design": "Canva for quick social graphics and thumbnails. Figma for custom illustrations. Unsplash for royalty-free photos.",
      "Video": "Descript is magic for podcast and video editing. CapCut for quick social clips.",
      "Publish": "WordPress for SEO-friendly blogs. Substack for newsletters. Buffer for social scheduling.",
      "Grow": "Google Analytics for traffic insights. Mailchimp for growing your email list.",
    },
    "startup-foundation": {
      "Comms": "Slack for real-time chat. Notion as your team wiki. Loom for async video updates.",
      "Projects": "Linear for beautiful issue tracking. GitHub Projects for dev-centric boards.",
      "Design": "Figma for product design. Framer for marketing sites. Canva for quick assets.",
      "Infra": "GitHub for code. Vercel for deployment. Supabase for backend.",
      "Ops": "Stripe for payments. Crisp for customer support chat. Google Workspace for email and docs.",
    },
    "open-source-maintainer": {
      "Code": "GitHub is home for OSS. VS Code and Cursor for development.",
      "CI/CD": "GitHub Actions for CI pipelines. Codecov for coverage tracking.",
      "Docs": "Docusaurus for feature-rich docs. Mintlify for beautiful API docs.",
      "Community": "Discord for real-time community. GitHub Discussions for async Q&A.",
      "Funding": "GitHub Sponsors for individual supporters. Open Collective for organizational funding.",
    },
  };

  const notes = editorNotes[stack.slug] || {};

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground pt-5 mb-5">
        <Link href="/stacks" className="hover:text-foreground transition-colors">Stacks</Link>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">{stack.name}</span>
      </nav>

      {/* Hero */}
      <div className="pb-8">
        <h1 className="text-[clamp(1.5rem,3.5vw,2.25rem)] font-extrabold tracking-[-0.03em]">
          {stack.name}
        </h1>
        <p className="text-base text-muted-foreground mt-2 max-w-[60ch] leading-relaxed">
          {stack.description}
        </p>
        <div className="flex gap-1.5 mt-3.5">
          {stack.slug === "indie-developer-toolkit" && (
            <>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">#indie-hacker</span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">#saas</span>
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium text-muted-foreground">#solo-dev</span>
            </>
          )}
        </div>
      </div>

      {/* Horizontal progress bar */}
      <div className="flex border border-border rounded-2xl overflow-hidden bg-card shadow-sm mb-10">
        {stack.stages.map((stage, idx) => (
          <a
            key={stage.name}
            href={`#stage-${idx + 1}`}
            className={`flex-1 py-2.5 px-2 text-center text-[0.6875rem] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer ${idx < stack.stages.length - 1 ? "border-r border-border" : ""}`}
          >
            <span className="block text-[0.5625rem] text-muted-foreground/60 uppercase tracking-wider mb-0.5">
              {String(idx + 1).padStart(2, "0")}
            </span>
            {stage.name}
          </a>
        ))}
      </div>

      {/* Stages timeline */}
      <div className="pb-10">
        {stack.stages.map((stage, idx) => (
          <div key={stage.name} id={`stage-${idx + 1}`} className="relative pl-10 mb-10 last:mb-0">
            {/* Timeline line */}
            {idx < stack.stages.length - 1 && (
              <div className="absolute left-[11px] top-8 bottom-[-40px] w-0.5 bg-gradient-to-b from-border to-transparent" />
            )}
            {/* Timeline dot */}
            <div className="absolute left-[5px] top-1 w-3.5 h-3.5 rounded-full bg-primary border-[3px] border-accent shadow-[0_0_0_3px_var(--background)]" />

            {/* Stage header */}
            <div className="text-[0.625rem] font-bold text-primary uppercase tracking-wider font-mono mb-0.5">
              Stage {String(idx + 1).padStart(2, "0")}
            </div>
            <h2 className="text-lg font-bold tracking-[-0.015em]">{stage.name}</h2>
            {stack.slug === "indie-developer-toolkit" && (
              <p className="text-[0.8125rem] text-muted-foreground mt-0.5">
                {idx === 0 && "Validate your idea and research the market before writing code."}
                {idx === 1 && "Design your product's interface and create visual assets."}
                {idx === 2 && "Write code, manage versions, and leverage AI assistance."}
                {idx === 3 && "Ship your product to production with modern hosting."}
                {idx === 4 && "Track user behavior, monitor errors, and measure what matters."}
                {idx === 5 && "Get your product in front of users and build an audience."}
              </p>
            )}

            {/* Tool cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-4">
              {stage.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex gap-2.5 p-3.5 rounded-xl border border-border/80 bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[0.6875rem] font-bold text-white shrink-0"
                    style={{
                      background: tool.color,
                      color: tool.color === "#FFE01B" ? "#1C1917" : "#fff",
                    }}
                  >
                    {tool.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[0.8125rem] font-semibold">{tool.name}</div>
                    <div className="flex gap-1.5 mt-1.5">
                      <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[0.6875rem] font-medium text-accent-foreground">
                        Freemium
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Editor note */}
            {notes[stage.name] && (
              <div className="mt-3.5 px-3.5 py-2.5 bg-muted/50 border-l-[3px] border-primary rounded-r-lg text-xs text-secondary-foreground leading-relaxed">
                {notes[stage.name]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-6 pb-16">
        <Link href="/stacks">
          <button className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg border border-border text-sm font-semibold hover:bg-muted transition-colors">
            Explore more stacks
          </button>
        </Link>
      </div>
    </div>
  );
}
