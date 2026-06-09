import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

const stacks = [
  {
    name: "Indie Developer Toolkit",
    slug: "indie-developer-toolkit",
    tagline: "Ship a SaaS product as a solo developer, from idea to launch.",
    description:
      "Everything you need to ship a SaaS product as a solo developer. From idea validation to launch and growth — a complete, opinionated tool chain.",
    icon: "terminal",
    sortOrder: 1,
    stages: [
      {
        name: "Idea & Research",
        description: "Validate your idea and research the market before writing code.",
        editorNote:
          "Use Perplexity for rapid market research, Notion to organize findings, and Excalidraw to sketch initial concepts.",
        sortOrder: 1,
        tools: ["perplexity", "notion", "excalidraw"],
      },
      {
        name: "Design",
        description: "Design your product's interface and create visual assets.",
        editorNote:
          "Figma is the industry standard for UI. Canva for quick marketing graphics. Excalidraw for architecture diagrams.",
        sortOrder: 2,
        tools: ["figma", "canva", "excalidraw"],
      },
      {
        name: "Development",
        description: "Write code, manage versions, and leverage AI assistance.",
        editorNote:
          "Cursor supercharges coding with AI. VS Code is the reliable fallback. GitHub is non-negotiable for version control.",
        sortOrder: 3,
        tools: ["cursor", "vs-code", "github"],
      },
      {
        name: "Deploy & Host",
        description: "Ship your product to production with modern hosting.",
        editorNote:
          "Vercel for your Next.js frontend, Railway for backend services, Supabase for database and auth — the modern indie stack.",
        sortOrder: 4,
        tools: ["vercel", "railway", "supabase"],
      },
      {
        name: "Analytics & Monitoring",
        description: "Track user behavior, monitor errors, and measure what matters.",
        editorNote:
          "PostHog is all-in-one for product analytics. Sentry catches errors before users report them. Plausible is the ethical pick.",
        sortOrder: 5,
        tools: ["posthog", "sentry", "plausible"],
      },
      {
        name: "Launch & Grow",
        description: "Get your product in front of users and build an audience.",
        editorNote:
          "Launch on Product Hunt for day-one visibility. Build your email list early with Mailchimp. Buffer keeps your social consistent.",
        sortOrder: 6,
        tools: ["product-hunt", "mailchimp", "buffer"],
      },
    ],
  },
  {
    name: "Content Creator Suite",
    slug: "content-creator-suite",
    tagline: "Create, publish, and grow your content across platforms.",
    description:
      "Tools to create, publish, and grow your content across platforms — blogs, videos, podcasts, and newsletters.",
    icon: "pen-tool",
    sortOrder: 2,
    stages: [
      {
        name: "Writing & Ideation",
        description: "Plan content, draft articles, and refine your writing.",
        editorNote:
          "Notion for organizing your content calendar. ChatGPT for brainstorming and drafts. Hemingway for punchy, readable prose.",
        sortOrder: 1,
        tools: ["notion", "chatgpt", "hemingway-editor"],
      },
      {
        name: "Visual Design",
        description: "Create thumbnails, graphics, and visual assets.",
        editorNote:
          "Canva for quick social graphics and thumbnails. Figma for custom illustrations. Unsplash for royalty-free photos.",
        sortOrder: 2,
        tools: ["canva", "figma", "unsplash"],
      },
      {
        name: "Video & Audio",
        description: "Record, edit, and produce video and audio content.",
        editorNote:
          "Descript is magic for podcast and video editing. CapCut for quick social clips.",
        sortOrder: 3,
        tools: ["descript", "capcut"],
      },
      {
        name: "Publishing",
        description: "Distribute your content across platforms.",
        editorNote:
          "WordPress for SEO-friendly blogs. Substack for newsletters. Buffer for social scheduling.",
        sortOrder: 4,
        tools: ["wordpress", "substack", "buffer"],
      },
      {
        name: "Growth & Analytics",
        description: "Track performance and grow your audience.",
        editorNote:
          "Google Analytics for traffic insights. Mailchimp for growing your email list.",
        sortOrder: 5,
        tools: ["google-analytics", "mailchimp"],
      },
    ],
  },
  {
    name: "Startup Foundation",
    slug: "startup-foundation",
    tagline: "Essential tools to set up and run a lean startup team.",
    description:
      "Essential tools to set up and run a lean startup team — communication, project management, and operations for early-stage teams of 2-5 people.",
    icon: "building",
    sortOrder: 3,
    stages: [
      {
        name: "Communication",
        description: "Keep your team aligned with async and sync communication.",
        editorNote:
          "Slack for real-time chat. Notion as your team wiki. Loom for async video updates.",
        sortOrder: 1,
        tools: ["slack", "notion", "loom"],
      },
      {
        name: "Project Management",
        description: "Track work, ship features, and stay organized.",
        editorNote:
          "Linear for beautiful issue tracking. GitHub Projects for dev-centric boards.",
        sortOrder: 2,
        tools: ["linear", "github"],
      },
      {
        name: "Design & Prototyping",
        description: "Design your product and create marketing assets.",
        editorNote:
          "Figma for product design. Framer for marketing sites. Canva for quick assets.",
        sortOrder: 3,
        tools: ["figma", "framer", "canva"],
      },
      {
        name: "Development Infrastructure",
        description: "Code hosting, deployment, and backend services.",
        editorNote:
          "GitHub for code. Vercel for deployment. Supabase for backend.",
        sortOrder: 4,
        tools: ["github", "vercel", "supabase"],
      },
      {
        name: "Business Operations",
        description: "Payments, support, and day-to-day operations.",
        editorNote:
          "Stripe for payments. Crisp for customer support chat. Google Workspace for email and docs.",
        sortOrder: 5,
        tools: ["stripe", "crisp", "google-workspace"],
      },
    ],
  },
  {
    name: "Open Source Maintainer",
    slug: "open-source-maintainer",
    tagline: "Manage an open source project from code to community to funding.",
    description:
      "The complete toolkit for managing an open source project — from code quality and CI/CD to documentation, community building, and sustainable funding.",
    icon: "git-branch",
    sortOrder: 4,
    stages: [
      {
        name: "Code & Editor",
        description: "Write, review, and manage your codebase.",
        editorNote:
          "GitHub is home for OSS. VS Code and Cursor for development.",
        sortOrder: 1,
        tools: ["github", "vs-code", "cursor"],
      },
      {
        name: "CI/CD",
        description: "Automate testing, builds, and releases.",
        editorNote:
          "GitHub Actions for CI pipelines. Codecov for coverage tracking.",
        sortOrder: 2,
        tools: ["github-actions", "codecov"],
      },
      {
        name: "Documentation",
        description: "Write and publish project documentation.",
        editorNote:
          "Docusaurus for feature-rich docs. Mintlify for beautiful API docs.",
        sortOrder: 3,
        tools: ["docusaurus", "mintlify"],
      },
      {
        name: "Community",
        description: "Build and engage your contributor community.",
        editorNote:
          "Discord for real-time community. GitHub Discussions for async Q&A.",
        sortOrder: 4,
        tools: ["discord", "github"],
      },
      {
        name: "Funding",
        description: "Sustain your project with sponsorships and donations.",
        editorNote:
          "GitHub Sponsors for individual supporters. Open Collective for organizational funding.",
        sortOrder: 5,
        tools: ["github-sponsors", "open-collective"],
      },
    ],
  },
];

async function main() {
  for (const stackData of stacks) {
    const stack = await prisma.stack.upsert({
      where: { slug: stackData.slug },
      update: {
        name: stackData.name,
        tagline: stackData.tagline,
        description: stackData.description,
        icon: stackData.icon,
        sortOrder: stackData.sortOrder,
      },
      create: {
        name: stackData.name,
        slug: stackData.slug,
        tagline: stackData.tagline,
        description: stackData.description,
        icon: stackData.icon,
        sortOrder: stackData.sortOrder,
      },
    });

    for (const stageData of stackData.stages) {
      const existingStage = await prisma.stage.findFirst({
        where: { stackId: stack.id, name: stageData.name },
      });

      const stage = existingStage
        ? await prisma.stage.update({
            where: { id: existingStage.id },
            data: {
              description: stageData.description,
              editorNote: stageData.editorNote,
              sortOrder: stageData.sortOrder,
            },
          })
        : await prisma.stage.create({
            data: {
              name: stageData.name,
              description: stageData.description,
              editorNote: stageData.editorNote,
              sortOrder: stageData.sortOrder,
              stackId: stack.id,
            },
          });

      for (let i = 0; i < stageData.tools.length; i++) {
        const toolSlug = stageData.tools[i];
        const tool = await prisma.tool.findFirst({ where: { slug: toolSlug } });
        if (!tool) {
          console.warn(`  Tool "${toolSlug}" not found, skipping.`);
          continue;
        }
        await prisma.stageRecommendation.upsert({
          where: { stageId_toolId: { stageId: stage.id, toolId: tool.id } },
          update: { sortOrder: i },
          create: { stageId: stage.id, toolId: tool.id, sortOrder: i },
        });
      }
    }

    console.log(`Seeded stack: ${stackData.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
