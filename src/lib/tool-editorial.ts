export type ToolEditorial = {
  summary: string;
  bestFor: string;
  checkBeforeChoosing: string;
  reviewedOn: string;
  sources: { label: string; url: string }[];
  alternatives: { slug: string; reason: string }[];
  licenseNote?: string;
};

const reviewedOn = "2026-10-13";
function entry(summary: string, bestFor: string, checkBeforeChoosing: string, url: string, alternatives: ToolEditorial["alternatives"] = []): ToolEditorial {
  return { summary, bestFor, checkBeforeChoosing, reviewedOn, sources: [{ label: /\/pricing\/?$/.test(url) ? "Official pricing and billing" : "Official documentation", url }], alternatives };
}

// Documentation-based guidance. These are editorial recommendations, not benchmark results.
export const toolEditorial: Record<string, ToolEditorial> = {
  chatgpt: entry(
    "ChatGPT is a conversational assistant for drafting, analysis, coding, and working with files. Available tools depend on the account and plan.",
    "Exploring an idea and iterating on drafts in a conversational workspace.",
    "Check which tools and usage limits your plan includes; verify generated facts against original sources.",
    "https://help.openai.com/en/articles/9260256-chatgpt-capabilities-overview",
    [{ slug: "claude", reason: "Consider a project workspace for discussions grounded in uploaded context." }, { slug: "perplexity", reason: "Consider a search-first workflow when finding and checking web sources is the main task." }],
  ),
  claude: entry(
    "Claude is Anthropic's assistant. Projects organize conversations around shared documents and instructions.",
    "Iterating on a specification or draft with a reusable set of project documents.",
    "Check the current project, file, and usage limits for your account; review generated conclusions before acting on them.",
    "https://support.claude.com/en/articles/9517075-what-are-projects",
    [{ slug: "chatgpt", reason: "Consider a general assistant workspace for varied drafting and analysis tasks." }, { slug: "perplexity", reason: "Consider an answer engine when the deliverable is a collection of cited web findings." }],
  ),
  perplexity: entry(
    "Perplexity combines web search with conversational answers and links to supporting sources.",
    "Finding candidate sources for market research before reading the underlying evidence.",
    "Open the cited pages and confirm that they support the answer; citations alone do not verify a conclusion.",
    "https://www.perplexity.ai/help-center/en/articles/10352155-what-is-perplexity",
    [{ slug: "chatgpt", reason: "Consider a general assistant when drafting and iterating matter more than search discovery." }, { slug: "claude", reason: "Consider a document-focused workspace for analyzing a supplied body of material." }],
  ),
  cursor: entry(
    "Cursor is a coding agent and editor for understanding repositories, implementing features, and reviewing changes.",
    "Working on an existing codebase with AI assistance inside the development workflow.",
    "Review diffs and run relevant tests; check model usage, privacy settings, and plan limits.",
    "https://cursor.com/docs",
    [{ slug: "replit", reason: "Consider a hosted build environment when you want to prototype without setting up a local project." }, { slug: "vs-code-web", reason: "Consider browser editing when lightweight repository changes are enough." }],
  ),
  figma: entry(
    "Figma provides collaborative design tools for interfaces, prototypes, and reusable design assets.",
    "Designing a product interface that needs shared components and feedback before implementation.",
    "Check seat types, collaboration permissions, and the features included in your chosen plan.",
    "https://www.figma.com/pricing/",
    [{ slug: "excalidraw", reason: "Choose a sketching workflow when communicating a flow matters more than polished interface components." }, { slug: "canva", reason: "Choose template-oriented design when the deliverable is a thumbnail, presentation, or campaign asset." }],
  ),
  excalidraw: entry(
    "Excalidraw is an open-source whiteboard for hand-drawn-style diagrams, with an editable drawing format.",
    "Sketching user journeys, architecture, and early concepts before detailed design.",
    "Decide how drawings will be stored and shared, and whether you need features from the hosted service or the editor library.",
    "https://github.com/excalidraw/excalidraw",
    [{ slug: "figma", reason: "Move to interface design when you need detailed layouts and reusable components." }, { slug: "tldraw", reason: "Explore another canvas approach when you are building a drawing experience into your own product." }],
  ),
  notion: entry(
    "Notion combines documents, databases, and collaboration in a workspace.",
    "Keeping research notes, product specifications, and a content calendar together.",
    "Check sharing permissions and export requirements before making it the sole home for important project records.",
    "https://www.notion.com/help",
    [{ slug: "hackmd", reason: "Consider collaborative Markdown when your deliverable is a portable text document." }, { slug: "obsidian", reason: "Consider a file-centered note workflow when local knowledge management is the priority." }],
  ),
  github: entry(
    "GitHub hosts repositories and provides branches, pull requests, and collaboration around code changes.",
    "Keeping a versioned source of truth for code and reviewing changes before release.",
    "Choose repository visibility and access permissions deliberately; add checks appropriate to your release process.",
    "https://docs.github.com/en/pull-requests/concepts/writing-code-for-a-project",
  ),
  vercel: entry(
    "Vercel provides application deployment, framework integrations, and deployment workflows.",
    "Deploying a frontend or framework-based app with a repeatable preview and release process.",
    "Check runtime limits, usage billing, and terms for your intended workload before choosing a plan.",
    "https://vercel.com/docs",
    [{ slug: "railway", reason: "Compare service hosting when your architecture includes separately deployed backend processes." }, { slug: "netlify", reason: "Compare another managed deployment workflow for your frontend framework." }],
  ),
  railway: entry(
    "Railway provides deployment and management of application services and infrastructure.",
    "Hosting backend services alongside the rest of a small product's infrastructure.",
    "Check resource usage, persistent storage, networking, and backup requirements for each service.",
    "https://docs.railway.com/",
    [{ slug: "vercel", reason: "Compare a framework-oriented deployment workflow for the frontend part of your app." }, { slug: "render", reason: "Compare another managed service host against your runtime and resource requirements." }],
  ),
  supabase: entry(
    "Supabase provides a Postgres-based backend with authentication, storage, and APIs.",
    "Building a product that needs a relational database and integrated backend services.",
    "Review access policies, backups, and database costs; a hosted backend still needs a deliberate security model.",
    "https://supabase.com/docs",
    [{ slug: "firebase", reason: "Compare a different backend data model and ecosystem before committing your application architecture." }],
  ),
  replit: entry(
    "Replit provides an environment for turning ideas into applications, iterating on projects, and publishing them.",
    "Producing a working prototype before investing in a local development setup.",
    "Check deployment costs, code export, and how you will maintain the app after the prototype stage.",
    "https://docs.replit.com/",
    [{ slug: "stackblitz", reason: "Consider a browser-based JavaScript environment for examples and reproducible demos." }, { slug: "cursor", reason: "Consider repository-based development when maintaining the codebase becomes the main task." }],
  ),
  stackblitz: entry(
    "StackBlitz is an online development environment for frontend, Node.js, and JavaScript projects.",
    "Sharing a reproducible JavaScript demo or trying an interface idea in the browser.",
    "Check browser and runtime compatibility for the packages and services your project needs.",
    "https://developer.stackblitz.com/",
    [{ slug: "replit", reason: "Consider a hosted application build workflow when publishing an entire prototype is the goal." }, { slug: "codesandbox", reason: "Compare another sandbox workflow for sharing code and development environments." }],
  ),
  canva: entry(
    "Canva provides design tools and templates for visual content such as social graphics and presentations.",
    "Producing consistent thumbnails and campaign visuals without designing each asset from scratch.",
    "Check the license for each asset and which templates, brand features, and exports your plan includes.",
    "https://www.canva.com/help/",
    [{ slug: "figma", reason: "Consider interface design when the deliverable requires reusable product components." }],
  ),
  descript: entry(
    "Descript supports audio and video editing through a transcript-based workflow.",
    "Editing spoken content by working through a transcript and checking the resulting media.",
    "Review transcription accuracy and export requirements on a representative recording before committing your production workflow.",
    "https://help.descript.com/hc/en-us/articles/10164808475149-Inline-notes",
    [{ slug: "kapwing", reason: "Compare a browser editing workflow when short visual clips are your main output." }],
  ),
  buffer: entry(
    "Buffer lets you compose and schedule posts for connected social channels.",
    "Planning a repeatable distribution schedule for content you have already produced.",
    "Check supported channels, posting permissions, and scheduling limits for your account.",
    "https://support.buffer.com/article/642-scheduling-posts",
    [{ slug: "make", reason: "Consider an automation workflow when distribution is only one step in a larger process." }],
  ),
  zapier: entry(
    "Zapier connects applications through automated workflows, with plans and usage based on the selected capabilities and tasks.",
    "Connecting business applications when a managed workflow suits the team maintaining it.",
    "Estimate successful action volume and check required integrations and plan features before budgeting.",
    "https://zapier.com/pricing",
    [{ slug: "make", reason: "Compare a visual scenario workflow for branching and data transformations." }, { slug: "n8n", reason: "Compare self-hosting when operating the workflow infrastructure is an explicit requirement." }],
  ),
  make: entry(
    "Make provides visual automation scenarios, with plan allowances measured in credits.",
    "Mapping a workflow with multiple steps and transformations before connecting the production services.",
    "Estimate credits for a full scenario, including retries and AI steps, using the current pricing rules.",
    "https://www.make.com/pricing",
    [{ slug: "zapier", reason: "Compare a managed app-connection workflow against your required connectors and task volume." }, { slug: "n8n", reason: "Compare self-hosting when infrastructure control is worth the maintenance effort." }],
  ),
  n8n: {
    ...entry(
      "n8n is a workflow automation platform with hosted and self-hosted deployment options. Its Sustainable Use License is source-available, not an OSI open-source license.",
      "Operating automation on your own infrastructure when the team can maintain and secure it.",
      "Review the license for your use case and account for server operations, upgrades, backups, and any paid features.",
      "https://docs.n8n.io/hosting/",
      [{ slug: "make", reason: "Compare managed visual scenarios when the team does not want to operate a workflow server." }, { slug: "zapier", reason: "Compare managed app integrations when connector coverage and simple operations drive the decision." }],
    ),
    licenseNote: "Source-available under the Sustainable Use License; review its conditions for your use case.",
    sources: [{ label: "Hosting documentation", url: "https://docs.n8n.io/hosting/" }, { label: "Sustainable Use License", url: "https://github.com/n8n-io/n8n/blob/master/LICENSE.md" }],
  },
  posthog: entry(
    "PostHog provides event-based product analytics, including trends, funnels, and retention insights.",
    "Understanding whether users complete a defined product workflow and return to use it again.",
    "Define meaningful events and data collection rules before interpreting a dashboard or comparing conversion rates.",
    "https://posthog.com/docs/product-analytics",
    [{ slug: "mixpanel", reason: "Compare another event-based analytics workflow against your reporting requirements." }, { slug: "plausible", reason: "Consider a web traffic measurement workflow when product-level events are unnecessary." }],
  ),
};
