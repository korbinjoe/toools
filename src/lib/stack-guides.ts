export type StackGuide = {
  title: string;
  description: string;
  reviewedOn: string;
  recommendation: string;
  rows: { stage: string; tools: string[]; rationale: string; check: string }[];
  handoffs: string[];
  budget: string[];
  questions: { question: string; answer: string }[];
};

export const stackGuides: Record<string, StackGuide> = {
  "ai-product-builder": {
    title: "AI Product Development Stack",
    description: "Choose tools for AI product research, prototyping, design, automation, and deployment, with a practical handoff and budgeting checklist.",
    reviewedOn: "2026-10-13",
    recommendation: "Start with one assistant, one prototype environment, and one deployment path. Add automation after you can describe a repeatable task and its success criteria. Choose each tool for the stage it needs to serve rather than subscribing to every option in the stack.",
    rows: [
      { stage: "Research and specification", tools: ["chatgpt", "claude", "perplexity"], rationale: "Use an assistant to iterate on the brief; use cited search to discover sources that you then read and verify.", check: "Can you turn the research into a specific user problem, acceptance criteria, and a list of unresolved assumptions?" },
      { stage: "Prototype", tools: ["replit", "stackblitz"], rationale: "Use Replit for a hosted app prototype, or StackBlitz for a reproducible JavaScript demo. Choose one for the first experiment.", check: "Can you export the code, reproduce the environment, and maintain the app after the experiment?" },
      { stage: "Design", tools: ["excalidraw", "figma"], rationale: "Sketch the flow in Excalidraw. Use Figma when detailed layouts and shared components will reduce implementation ambiguity.", check: "Are loading, empty, error, and mobile states part of the design?" },
      { stage: "Automation", tools: ["zapier", "make", "n8n"], rationale: "Compare managed app integrations and visual scenarios. Consider self-hosted n8n when infrastructure control is a requirement and the team can operate it.", check: "Check connector coverage, retries, usage costs, and licensing. n8n is source-available; self-hosting includes operating work." },
      { stage: "Deploy and data", tools: ["vercel", "railway", "supabase"], rationale: "Choose a host that fits your app runtime. Add Supabase when you need its Postgres-based backend services; frontend hosting and a database solve different jobs.", check: "Can you deploy from versioned code, restore data, and keep credentials on the server?" },
    ],
    handoffs: ["Research → prototype: pass a brief with a target user, a concrete task, and observable acceptance criteria.", "Prototype → implementation: keep the source code and setup instructions in version control; list temporary shortcuts.", "Implementation → automation: define inputs, outputs, retry behavior, and who handles failures.", "Deploy → learn: measure a completed user task, review failures, and use those observations to choose the next improvement."],
    budget: ["Choose one assistant plan first; a chat subscription and API usage may have separate billing.", "Estimate prototype and hosting costs using the expected runtime, storage, and traffic.", "Run a representative automation and count billable tasks, credits, or executions according to each provider's current rules.", "Treat self-hosting as a combination of infrastructure cost and maintenance time, not as zero-cost operation."],
    questions: [
      { question: "Do I need every tool in this AI product stack?", answer: "No. The tools are alternatives within stages or services for different responsibilities. Start with the smallest set that completes a real user task, then add a tool when you can explain the gap it fills." },
      { question: "How should I choose between Zapier, Make, and n8n?", answer: "First confirm the integrations and operations your workflow requires. Compare managed operation with self-hosting, then calculate costs using a representative run. Review n8n's license if you plan to expose its functionality to customers." },
      { question: "What should survive the prototype stage?", answer: "A versioned codebase, a reproducible setup, the decision record, and evidence of whether the target task works. These make it possible to continue development or change providers." },
    ],
  },
  "indie-developer-toolkit": {
    title: "Indie Developer Toolkit for Building a SaaS",
    description: "A practical SaaS tool stack for solo developers: research, design, coding, deployment, and launch, with selection criteria and cost checks.",
    reviewedOn: "2026-10-13",
    recommendation: "For a solo SaaS project, optimize for a workflow you can maintain alone. Write a short product brief, keep one source repository, choose a host that matches the runtime, and add a database only when the product needs durable shared data. Avoid running multiple services for the same job before you have users.",
    rows: [
      { stage: "Research", tools: ["perplexity", "notion"], rationale: "Discover candidate sources, read them, and keep the findings next to the product assumptions and customer notes.", check: "Is there evidence for the problem from prospective users, beyond an AI-generated market summary?" },
      { stage: "Design", tools: ["excalidraw", "figma"], rationale: "Sketch the key task first. Invest in detailed interface components when they help you implement consistently.", check: "Can a user complete the core task on a narrow screen and recover from errors?" },
      { stage: "Development", tools: ["cursor", "replit", "github"], rationale: "Choose a coding environment that fits how you work and keep code in a versioned repository. Review AI changes as you would other contributions.", check: "Can you run the app and the relevant checks from the repository instructions?" },
      { stage: "Deployment", tools: ["vercel", "railway", "supabase"], rationale: "Match the hosting model to the application. Treat database and authentication setup as separate architectural decisions.", check: "Review resource limits, access policies, backups, and the point at which usage starts increasing costs." },
      { stage: "Launch and distribution", tools: ["buffer", "canva"], rationale: "Prepare a clear product explanation and a repeatable distribution schedule after the core workflow is usable.", check: "Does the landing page explain who the product helps and show how to try it?" },
    ],
    handoffs: ["Research → design: turn customer evidence into a problem statement and one primary user task.", "Design → code: define acceptance criteria and the loading, empty, and error states before implementation.", "Code → production: use a repeatable deployment, record configuration, and test the main workflow on the deployed app.", "Launch → iteration: record how people arrive and whether they complete the core task; prioritize the observed bottleneck."],
    budget: ["Pick one paid coding or assistant workflow before adding overlapping subscriptions.", "Budget for hosting, database, storage, email, and domains separately where applicable.", "Compare total cost at realistic usage; a prototype allowance does not establish production cost.", "Check commercial-use terms, backup options, and migration work before selecting the cheapest entry plan."],
    questions: [
      { question: "What is the minimum tool stack for a solo SaaS?", answer: "A development environment, version control, and a deployment path. Add a database, authentication, email, and monitoring according to the product's actual requirements. A tool directory cannot determine those requirements for every app." },
      { question: "Should I choose Vercel or Railway?", answer: "Start with the runtime and deployment requirements of your app. Compare a framework-oriented frontend deployment workflow with hosting separate services, and verify limits and pricing for the workload you intend to run." },
      { question: "When should I add more analytics?", answer: "When you have a question about user behavior that existing traffic and error information cannot answer. Define the completed task and the events needed to measure it before choosing another analytics service." },
    ],
  },
  "content-creator-suite": {
    title: "Content Creator Workflow and Tool Stack",
    description: "Choose tools for planning, writing, visual design, spoken-content editing, and distribution, with a repeatable creator workflow and cost checklist.",
    reviewedOn: "2026-10-13",
    recommendation: "Build the workflow around one primary content format and one publishing destination. Keep the brief and source material together, create a repeatable visual template, and schedule distribution after the original content has passed review. Add a video editor only if spoken or visual media is part of the output.",
    rows: [
      { stage: "Plan and write", tools: ["notion", "chatgpt", "claude"], rationale: "Keep the calendar and research in a workspace. Use an assistant to explore a draft, with source material and the intended audience supplied.", check: "Can a reader distinguish sourced facts from your opinion, and have you checked factual claims?" },
      { stage: "Create visuals", tools: ["canva", "figma"], rationale: "Use Canva for a repeatable template-based asset workflow. Use Figma when custom layouts and shared design components are part of the work.", check: "Check asset licenses, readable text, and the size requirements of the destination platform." },
      { stage: "Edit spoken media", tools: ["descript"], rationale: "Use a transcript-based edit for spoken content, then review the audio or video itself rather than relying on the transcript alone.", check: "Test transcription, captions, and the required exports on a representative recording." },
      { stage: "Distribute", tools: ["buffer"], rationale: "Schedule supporting posts for connected channels after publishing the original content on your chosen destination.", check: "Confirm account permissions, channel support, time zone, and that each post leads to the intended content." },
    ],
    handoffs: ["Brief → draft: pass the audience, intended outcome, source links, and the format constraints.", "Draft → design: extract the main message and prepare assets with consistent dimensions and legible text.", "Edit → publish: review factual claims, media quality, captions, links, and asset permissions.", "Publish → distribution: reuse the core idea in channel-appropriate posts and record which content attracts engaged readers."],
    budget: ["Choose the primary format before paying for overlapping writing, design, and video tools.", "Check design seat and asset allowances, media processing limits, and social channel counts.", "Confirm that exports and distribution features needed for the finished work are included in the selected plans.", "Compare costs per useful published piece, including review time, rather than subscription prices alone."],
    questions: [
      { question: "Can AI write all of my content?", answer: "An assistant can help outline, draft, and rewrite. The publisher still needs to check facts, permissions, originality, and whether the piece serves the audience. Keep source links with the draft so review is possible." },
      { question: "Should I use Canva or Figma?", answer: "For repeatable campaign assets, start by evaluating a template workflow. For custom interface layouts and shared components, evaluate a product design workflow. Test both against the same representative deliverable instead of comparing feature counts alone." },
      { question: "Is a scheduling tool a publishing platform?", answer: "A scheduler helps distribute posts to connected channels. You still need to choose where the original article, newsletter, podcast, or video lives and check that the links and channel connections work." },
    ],
  },
};
