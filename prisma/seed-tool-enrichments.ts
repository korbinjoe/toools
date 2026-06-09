import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

type ToolEnrichment = {
  useCases: string[];
  pros: string[];
  cons: string[];
};

const enrichments: Record<string, ToolEnrichment> = {
  figma: {
    useCases: [
      "UI/UX design for web and mobile applications",
      "Creating and maintaining design systems with reusable components",
      "Interactive prototyping with transitions and micro-interactions",
      "Collaborative design reviews with real-time feedback",
    ],
    pros: [
      "Real-time multiplayer collaboration",
      "Powerful auto-layout and component system",
      "Generous free tier for small teams",
      "Browser-based — no installation required",
      "Massive plugin ecosystem",
    ],
    cons: [
      "Performance lags on very large files",
      "Limited offline mode",
      "Advanced prototyping trails dedicated tools",
      "Org-tier pricing adds up quickly",
    ],
  },
  cursor: {
    useCases: [
      "AI-assisted code generation and refactoring",
      "Pair programming with an AI coding partner",
      "Rapid prototyping of new features",
      "Understanding unfamiliar codebases",
    ],
    pros: [
      "Deep codebase context awareness",
      "Fast inline edits and multi-file changes",
      "Built on VS Code — familiar extensions work",
      "Strong for full-stack web development",
    ],
    cons: [
      "Subscription cost for advanced models",
      "Can suggest incorrect code without review",
      "Privacy considerations for proprietary code",
    ],
  },
  supabase: {
    useCases: [
      "PostgreSQL database with instant REST and GraphQL APIs",
      "User authentication and row-level security",
      "Real-time subscriptions for live apps",
      "File storage and edge functions",
    ],
    pros: [
      "Generous free tier",
      "Open source and self-hostable",
      "Excellent developer experience",
      "Built-in auth and storage",
    ],
    cons: [
      "Vendor lock-in for managed features",
      "Complex queries may need raw SQL",
      "Edge functions still maturing",
    ],
  },
  posthog: {
    useCases: [
      "Product analytics and funnel tracking",
      "Session replay for debugging UX issues",
      "Feature flags and A/B testing",
      "Self-hosted analytics for privacy compliance",
    ],
    pros: [
      "All-in-one product analytics suite",
      "Open source with self-host option",
      "Generous free tier",
      "Developer-friendly SDKs",
    ],
    cons: [
      "UI can feel overwhelming at first",
      "Self-hosting requires DevOps effort",
      "Advanced features on paid tiers",
    ],
  },
  linear: {
    useCases: [
      "Issue tracking for product and engineering teams",
      "Sprint planning and roadmap management",
      "Bug triage and prioritization",
      "Cross-team project visibility",
    ],
    pros: [
      "Beautiful, fast interface",
      "Keyboard-first workflow",
      "Strong GitHub integration",
      "Opinionated but efficient",
    ],
    cons: [
      "Less flexible than Jira for complex workflows",
      "No free tier for larger teams",
      "Limited reporting compared to enterprise tools",
    ],
  },
  notion: {
    useCases: [
      "Team wiki and documentation",
      "Project planning and task management",
      "Content calendar for creators",
      "Personal knowledge management",
    ],
    pros: [
      "Extremely flexible block-based editor",
      "Templates for almost any use case",
      "Good free tier for individuals",
      "Databases with multiple views",
    ],
    cons: [
      "Can become slow with large workspaces",
      "Offline mode is limited",
      "Not ideal as a dedicated project tracker",
    ],
  },
  github: {
    useCases: [
      "Version control and code collaboration",
      "CI/CD with GitHub Actions",
      "Open source project hosting",
      "Code review and pull request workflows",
    ],
    pros: [
      "Industry standard for code hosting",
      "Excellent collaboration features",
      "Massive ecosystem and integrations",
      "Free for public repositories",
    ],
    cons: [
      "Advanced security features require paid plans",
      "Can be complex for non-developers",
      "Microsoft ownership concerns for some OSS communities",
    ],
  },
  vercel: {
    useCases: [
      "Deploy Next.js and frontend apps with zero config",
      "Preview deployments for every pull request",
      "Edge functions and serverless APIs",
      "Static site hosting with global CDN",
    ],
    pros: [
      "Best-in-class Next.js integration",
      "Instant preview URLs",
      "Excellent developer experience",
      "Generous hobby tier",
    ],
    cons: [
      "Costs scale quickly with traffic",
      "Vendor lock-in for Vercel-specific features",
      "Serverless cold starts on free tier",
    ],
  },
  canva: {
    useCases: [
      "Social media graphics and thumbnails",
      "Marketing materials and presentations",
      "Quick brand assets without a designer",
      "Video editing for short-form content",
    ],
    pros: [
      "Extremely easy to use",
      "Huge template library",
      "Collaboration for teams",
      "Generous free tier",
    ],
    cons: [
      "Less precise than professional design tools",
      "Brand kit features require Pro",
      "Export limitations on free tier",
    ],
  },
  excalidraw: {
    useCases: [
      "Architecture diagrams and whiteboarding",
      "Quick wireframes and sketches",
      "Collaborative brainstorming sessions",
      "Hand-drawn style technical diagrams",
    ],
    pros: [
      "Free and open source",
      "End-to-end encrypted collaboration",
      "Simple, focused tool",
      "Great for async diagram sharing",
    ],
    cons: [
      "Not suitable for polished UI design",
      "Limited shape library compared to dedicated tools",
      "No built-in presentation mode",
    ],
  },
  chatgpt: {
    useCases: [
      "Drafting and editing written content",
      "Brainstorming ideas and outlines",
      "Code explanation and debugging help",
      "Research summarization",
    ],
    pros: [
      "Versatile general-purpose AI assistant",
      "Strong reasoning on complex topics",
      "Wide plugin and integration ecosystem",
      "Continuous model improvements",
    ],
    cons: [
      "Can hallucinate facts",
      "Knowledge cutoff on older models",
      "Usage limits on free tier",
    ],
  },
  perplexity: {
    useCases: [
      "AI-powered market research",
      "Fact-checked answers with citations",
      "Competitive analysis and trend discovery",
      "Technical question research",
    ],
    pros: [
      "Cited sources for every answer",
      "Real-time web search",
      "Clean, focused interface",
      "Good for research workflows",
    ],
    cons: [
      "Pro features require subscription",
      "Not ideal for long-form writing",
      "Citation quality varies",
    ],
  },
  slack: {
    useCases: [
      "Team messaging and channels",
      "Integrations with dev tools",
      "Async communication for remote teams",
      "Incident response coordination",
    ],
    pros: [
      "Industry standard for team chat",
      "Massive integration ecosystem",
      "Searchable message history",
      "Huddles for quick voice calls",
    ],
    cons: [
      "Can become noisy without channel discipline",
      "Expensive at scale",
      "Message history limits on free tier",
    ],
  },
  railway: {
    useCases: [
      "Deploy backend services and APIs",
      "Managed PostgreSQL and Redis",
      "Full-stack app hosting",
      "Quick prototyping to production",
    ],
    pros: [
      "Simple deployment from GitHub",
      "Usage-based pricing",
      "Good developer experience",
      "Built-in databases",
    ],
    cons: [
      "Less mature than AWS/GCP",
      "Pricing can be unpredictable",
      "Limited region options",
    ],
  },
  buffer: {
    useCases: [
      "Schedule social media posts",
      "Manage multiple social accounts",
      "Analyze post performance",
      "Plan content calendars",
    ],
    pros: [
      "Simple, focused scheduling tool",
      "Clean analytics dashboard",
      "Works across major platforms",
      "Affordable for solopreneurs",
    ],
    cons: [
      "Limited advanced analytics",
      "No full social inbox on lower tiers",
      "Fewer integrations than Hootsuite",
    ],
  },
  mailchimp: {
    useCases: [
      "Email newsletter campaigns",
      "Automated drip sequences",
      "Landing pages and signup forms",
      "Audience segmentation",
    ],
    pros: [
      "Beginner-friendly email marketing",
      "Generous free tier for small lists",
      "Good template library",
      "Marketing CRM features",
    ],
    cons: [
      "Pricing jumps sharply with list size",
      "Deliverability requires list hygiene",
      "UI feels dated in places",
    ],
  },
  descript: {
    useCases: [
      "Podcast editing via text transcript",
      "Video editing with AI voice cloning",
      "Screen recording and tutorials",
      "Collaborative audio/video production",
    ],
    pros: [
      "Edit audio/video by editing text",
      "AI-powered filler word removal",
      "Overdub voice cloning",
      "Great for podcasters",
    ],
    cons: [
      "Learning curve for advanced features",
      "Export limits on free tier",
      "Can be resource-intensive",
    ],
  },
  loom: {
    useCases: [
      "Async video updates for teams",
      "Bug report walkthroughs",
      "Product demo recordings",
      "Customer support explanations",
    ],
    pros: [
      "Dead simple screen recording",
      "Instant shareable links",
      "Viewer analytics",
      "Chrome extension works everywhere",
    ],
    cons: [
      "Limited editing capabilities",
      "Free tier has recording limits",
      "Not suitable for polished production video",
    ],
  },
  unsplash: {
    useCases: [
      "Royalty-free photos for blogs and websites",
      "Social media visual content",
      "Presentation and pitch deck imagery",
      "Placeholder images during design",
    ],
    pros: [
      "High-quality free photos",
      "No attribution required (but appreciated)",
      "Simple search and collections",
      "API for developers",
    ],
    cons: [
      "Popular images appear everywhere",
      "Limited compared to paid stock libraries",
      "No vector or illustration focus",
    ],
  },
  plausible: {
    useCases: [
      "Privacy-friendly website analytics",
      "GDPR-compliant traffic monitoring",
      "Simple dashboard without cookie banners",
      "Tracking marketing campaign performance",
    ],
    pros: [
      "No cookies, GDPR compliant by default",
      "Lightweight script (< 1KB)",
      "Clean, focused dashboard",
      "Open source and self-hostable",
    ],
    cons: [
      "No free tier — paid only",
      "Less feature-rich than Google Analytics",
      "Limited e-commerce tracking",
    ],
  },
  sentry: {
    useCases: [
      "Error tracking and alerting",
      "Performance monitoring for web apps",
      "Release health tracking",
      "Debugging production issues",
    ],
    pros: [
      "Excellent error grouping and context",
      "Wide framework support",
      "Generous free tier",
      "Source map integration",
    ],
    cons: [
      "Can get expensive with high event volume",
      "Setup complexity for advanced features",
      "Alert fatigue without tuning",
    ],
  },
  claude: {
    useCases: ["Long-form writing and analysis", "Code review and generation", "Document summarization", "Research assistance"],
    pros: ["Strong reasoning on complex tasks", "Large context window", "Thoughtful, nuanced responses", "Good at following instructions"],
    cons: ["Usage limits on free tier", "No real-time web search on all plans", "Can be verbose"],
  },
  obsidian: {
    useCases: ["Personal knowledge management", "Linked note-taking", "Research organization", "Daily journaling"],
    pros: ["Local-first and private", "Powerful linking and graph view", "Extensive plugin ecosystem", "Markdown native"],
    cons: ["Steep learning curve", "Sync requires paid or DIY setup", "Mobile app less polished than desktop"],
  },
  penpot: {
    useCases: ["Open-source UI design", "Design system management", "Collaborative prototyping", "Figma alternative for teams"],
    pros: ["Free and open source", "Self-hostable", "Real-time collaboration", "No vendor lock-in"],
    cons: ["Smaller community than Figma", "Fewer third-party plugins", "Performance on very large files"],
  },
  replit: {
    useCases: ["Browser-based coding", "Quick prototyping", "Teaching programming", "Collaborative hackathons"],
    pros: ["Zero setup required", "Instant deployment", "Multiplayer editing", "AI coding assistant built in"],
    cons: ["Resource limits on free tier", "Not ideal for large production apps", "Performance constraints"],
  },
  codesandbox: {
    useCases: ["Frontend prototyping in the browser", "Sharing code snippets", "React/Vue/Angular sandboxes", "Code reviews with live preview"],
    pros: ["Fast boot times", "Excellent npm package support", "GitHub integration", "Great for demos"],
    cons: ["Limited for full-stack backend work", "Free tier restrictions", "Not a production hosting platform"],
  },
  "hemingway-editor": {
    useCases: ["Improving writing clarity", "Reducing passive voice", "Readability scoring", "Editing blog posts and prose"],
    pros: ["Instant readability feedback", "Highlights complex sentences", "Simple, focused interface", "Desktop app available"],
    cons: ["Not a full word processor", "No collaboration features", "Limited grammar checking"],
  },
  photopea: {
    useCases: ["Browser-based photo editing", "PSD file editing without Photoshop", "Quick image retouching", "Design asset preparation"],
    pros: ["Free tier available", "Supports PSD, AI, and Sketch files", "No installation needed", "Photoshop-like interface"],
    cons: ["Ads on free tier", "Performance on large files", "Less powerful than desktop Photoshop"],
  },
  tldraw: {
    useCases: ["Infinite canvas whiteboarding", "Quick diagrams and sketches", "Collaborative brainstorming", "Wireframing"],
    pros: ["Free and open source", "Fast and lightweight", "Great developer SDK", "Multiplayer support"],
    cons: ["Not for polished UI design", "Limited export formats", "Basic shape library"],
  },
  stackblitz: {
    useCases: ["Full-stack web development in browser", "Angular/React/Node prototyping", "Instant dev environments", "Open source project demos"],
    pros: ["WebContainers technology — runs Node in browser", "Fast startup", "GitHub import", "No server setup"],
    cons: ["Browser resource limits", "Not all npm packages work", "Best for frontend-focused projects"],
  },
  grammarly: {
    useCases: ["Grammar and spelling correction", "Tone and clarity suggestions", "Professional email writing", "Plagiarism checking"],
    pros: ["Works across browsers and apps", "Real-time suggestions", "Tone detection", "Generous free tier"],
    cons: ["Premium features require subscription", "Can over-correct creative writing", "Privacy concerns for sensitive text"],
  },
  "vs-code-web": {
    useCases: ["Edit code from any browser", "Quick fixes on the go", "GitHub.dev integration", "Lightweight code review"],
    pros: ["Full VS Code experience in browser", "No installation", "Extension support", "Free"],
    cons: ["Limited compared to desktop VS Code", "Requires internet connection", "Performance on large projects"],
  },
  gitpod: {
    useCases: ["Cloud development environments", "Instant dev setup from GitHub", "Onboarding new team members", "Consistent dev environments"],
    pros: ["Pre-configured environments", "Fast startup from repos", "VS Code in browser", "Good for open source"],
    cons: ["Usage limits on free tier", "Requires Gitpod configuration files", "Cold start times"],
  },
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, data] of Object.entries(enrichments)) {
    const tool = await prisma.tool.findFirst({ where: { slug } });
    if (!tool) {
      console.warn(`  Tool "${slug}" not found, skipping.`);
      skipped++;
      continue;
    }

    await prisma.tool.update({
      where: { id: tool.id },
      data: {
        useCases: data.useCases,
        pros: data.pros,
        cons: data.cons,
      },
    });
    updated++;
    console.log(`  Enriched: ${tool.name}`);
  }

  console.log(`\nDone. Updated ${updated} tools, skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
