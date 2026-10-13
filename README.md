# Toools

**Find the right tools for your entire workflow.**

[Live site](https://toools.top) · [Submit a tool](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml) · [Browse issues](https://github.com/korbinjoe/toools/issues)

Toools is an open-source **tool discovery and workflow curation platform**. It brings together GitHub Awesome lists, Product Hunt launches, maintainer selections, and community submissions. Explore recent additions, follow a workflow, or compare tools with visible source and popularity signals.

## Where the tools come from

| Source | What Toools collects | Public reference |
|--------|----------------------|------------------|
| GitHub Awesome lists | Linked tools, descriptions, categories, and available repository stars | [Source collections](scripts/lib/awesome.ts), [importer](scripts/import-awesome-lists.ts) |
| Product Hunt | Products by topic, descriptions, launch-page links, and vote counts | [Importer](scripts/import-producthunt.ts) |
| Maintainer selections | Initial tool collection, featured flags, workflow stages, and editor notes | [Tool seeds](prisma/seed.ts), [workflow seeds](prisma/seed-stacks.ts) |
| Community submissions | Tools and corrections suggested by makers and users through GitHub Issues | [Submit a tool](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml) |

Imports normalize URLs and avoid duplicates before assigning categories. New imports default to `PENDING`; `PH_AUTO_APPROVE=true` or `AWESOME_AUTO_APPROVE=true` explicitly enables automatic approval. Public directory queries include only `APPROVED` records. Approval does not establish that each product has been individually tested.

Source links appear on detail pages where saved. Awesome imports currently save the linked tool URL, which may be the provider or repository rather than the original list section. Stars and votes are snapshots from import or backfill runs; there is no continuous refresh guarantee.

## How recommendations are selected

**Featured is a discovery flag.** Maintainers can set it in curated data. The Product Hunt importer and backfill also set it for products with **more than 1,000 votes**. A featured badge alone does not mean hands-on testing or an independent quality score.

| Surface | Current selection rule |
|---------|------------------------|
| Recently Added | Six newest approved entries, preferring at most two per category before filling gaps. Category variety stays within 30 days of the newest entry, and selected tools remain newest first. Dates refer to addition to Toools. |
| Hero discovery | Up to six candidates from the newest featured pool, excluding recent entries; approved tools provide a fallback. The opening pick rotates daily in Asia/Shanghai time, with manual cycling via “Another pick”. |
| Editor's Picks | Up to four remaining featured tools, newest first, excluding tools reserved for recent additions and Hero discovery. |
| Browse | Default: featured first, then views. Other sorts: newest additions or outbound clicks. Category, pricing, platform, and open-source filters apply before sorting. |
| Other category tools | Automatic suggestions from the current tool's category, ordered by GitHub stars, then Product Hunt votes, then views. Category membership does not establish equivalent capabilities. |
| Workflow stages | Maintainer-defined tool choices and editor notes for a specific task. Related tools are selected from the stage's categories and ordered by `GitHub stars × 10 + Product Hunt votes`. |

GitHub stars, Product Hunt votes, views, and clicks provide popularity and activity context. **They are not quality ratings.** Views count tool-detail visits; clicks count tracked outbound visits, not unique users. Evaluate workflow fit and check current provider pricing, features, and licensing before choosing.

The homepage selector is public in [home-discovery.ts](src/lib/home-discovery.ts); browse ordering lives in [tools/page.tsx](src/app/tools/page.tsx), and workflow selection in [stacks.ts](src/lib/stacks.ts). Visitors can read the same explanation at [Sources & Selection](https://toools.top/how-we-curate).

## What makes Toools different

Two entry points, one decision loop:

```
Home → Stacks (by workflow) ──→ Stack detail (stages + editor picks) ──┐
     → Browse (by tool)      ──→ Tool listing (search + filters)      ──┤
                                                                        ▼
                                                          Tool detail (decision hub)
                                                          → Visit website via tracked link
```

**Scenario first, tools second.** Popular Stacks like *Indie Developer Toolkit* and *Content Creator Suite* map each stage of a workflow to curated recommendations with editor notes — so you pick a path before picking individual apps.

## Features

### Tool Stacks (core)

- **Curated workflows** — Multi-stage tool chains for indie devs, creators, startups, and open-source maintainers
- **Stage recommendations** — Each stage links to approved tools with pricing and trust signals
- **Editor notes** — Short rationale for why specific tools fit a stage
- **Cross-linking** — Tool detail pages show *Part of these Stacks*; category pages nudge users toward full workflows

### Browse & decide

- **Search & filters** — Name, description, tags, category, pricing, platform, open-source, and featured status; sort by popularity, recency, or clicks
- **Editor's Picks** — Featured tools selected by recency, with duplicates removed across homepage sections
- **Rich tool pages** — About, use cases, pros & cons, alternatives, and an *At a Glance* sidebar (pricing, platforms, open source, signals, freshness)
- **Visible signals** — GitHub stars, Product Hunt votes, featured badges, and view/click counts on cards; saved source links on detail pages
- **Click tracking** — Outbound visits go through `/api/tools/[slug]/out` to increment click counts before redirecting

### Community & data

- **Community submissions** — Structured GitHub Issue template and in-app guide at [toools.top/submit](https://toools.top/submit)
- **Bulk import pipeline** — Scripts to seed from Product Hunt and GitHub Awesome lists, plus trust-signal backfill
- **Dark mode** — System-aware theme toggle

## Tech Stack

| Layer | Choices |
|-------|---------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| UI | [React 19](https://react.dev) + [Base UI](https://base-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| Language | TypeScript |
| Database | PostgreSQL via [Prisma 7](https://www.prisma.io) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Typography | [Geist](https://vercel.com/font) Sans & Mono |
| Icons | [Lucide](https://lucide.dev) |

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (e.g. [Neon](https://neon.tech), local Postgres, or Vercel Postgres)

### 1. Clone and install

```bash
git clone https://github.com/korbinjoe/toools.git
cd toools
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@host:5432/toools"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_BASE_URL` | No | Public site URL (defaults to `https://toools.top`) |

Import and backfill scripts accept additional optional variables — see [Data import scripts](#data-import-scripts) below.

### 3. Set up the database

```bash
npx prisma migrate deploy
npx prisma db seed
npx tsx prisma/seed-stacks.ts
```

Recommended for the full product experience (Stacks pages and cross-links):

```bash
npx tsx prisma/seed-tool-enrichments.ts   # use cases, pros, cons on select tools
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:webpack` | Start dev server with Webpack (instead of Turbopack) |
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run backfill:signals` | Backfill trust signals (PH votes, GitHub stars, sources) |
| `npx prisma db seed` | Seed the database with curated tools |
| `npx prisma studio` | Open Prisma's database GUI |

### Data import scripts

These scripts live in `scripts/` (and `prisma/` for stack seeds) and require `DATABASE_URL` in your environment.

**Product Hunt import**

```bash
npx tsx scripts/import-producthunt.ts
```

Authentication — set one of:

- `PRODUCTHUNT_TOKEN` — bearer token from [producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications)
- `PRODUCTHUNT_API_KEY` + `PRODUCTHUNT_API_SECRET` — client credentials (token fetched automatically)

Optional: `PH_POSTS_PER_TOPIC` (default `100`), `PH_AUTO_APPROVE=true`.

**GitHub Awesome lists import**

```bash
npx tsx scripts/import-awesome-lists.ts
```

Optional: `GITHUB_TOKEN` for higher API rate limits, `AWESOME_AUTO_APPROVE=true` to auto-approve imports.

**Trust signal backfill**

For tools imported before trust-signal fields were added:

```bash
npx tsx scripts/backfill-trust-signals.ts
# or
npm run backfill:signals
```

Options: `--dry-run`, `--skip-awesome`, `--skip-github-stars`, `--skip-producthunt`, `--limit N`. Requires `GITHUB_TOKEN` (recommended) and/or Product Hunt credentials for full backfill.

**Other utilities**

```bash
npx tsx scripts/sync-categories.ts       # Sync category definitions
npx tsx scripts/recategorize.ts          # Re-run category matching on existing tools
npx tsx scripts/fix-icons.ts             # Backfill missing favicons
npx tsx scripts/db-stats.ts              # Print database statistics
npx tsx prisma/seed-stacks.ts            # Seed tool stacks and stage recommendations
npx tsx prisma/seed-tool-enrichments.ts  # Seed use cases, pros, and cons
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home — daily discovery, Recently Added, workflows, Editor's Picks
│   ├── how-we-curate/        # Public data sources and recommendation rules
│   ├── stacks/               # Workflow listing and stage-based stack detail
│   ├── tools/                # Browse listing (search, filters) and decision-focused detail
│   ├── categories/           # Category browse (with Stacks cross-links)
│   ├── submit/               # Community submission guide
│   └── api/                  # Click tracking redirect, featured tools API
├── components/               # Stack cards, tool signals, filters, layout
└── lib/                      # Database client, stacks data, signal helpers
prisma/
├── schema.prisma             # Tool, Category, Tag, Stack, Stage models
├── migrations/               # SQL migrations
├── seed.ts                   # Seed data (~100 curated tools)
├── seed-stacks.ts            # Nine curated workflows with stage recommendations
└── seed-tool-enrichments.ts  # Use cases, pros, cons for select tools
scripts/                      # Import and maintenance scripts
openspec/                     # Design proposals and change specs
```

Site navigation: **Stacks · Browse · Categories · Submit**

## Contributing

### Submit a tool

The easiest way to contribute is to [open a tool submission issue](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml). Fill in the template with the tool name, URL, tagline, description, category, and pricing. Maintainers review and approve submissions. You can also start from the in-app submit page at [toools.top/submit](https://toools.top/submit).

### Contribute code

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and ensure `npm run lint` passes
4. Open a pull request with a clear description of what changed and why

Bug reports and feature suggestions are welcome via [GitHub Issues](https://github.com/korbinjoe/toools/issues).

## Deployment

The app is designed to deploy on [Vercel](https://vercel.com) with a managed PostgreSQL instance. Set `DATABASE_URL` in your deployment environment, then run migrations and seeds against the production database:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma db seed
DATABASE_URL="postgresql://..." npx tsx prisma/seed-stacks.ts
DATABASE_URL="postgresql://..." npx tsx prisma/seed-tool-enrichments.ts
```

See `openspec/changes/vercel-deployment/` for detailed deployment notes.

## License

This project is open source. See the repository for license details.
