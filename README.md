# Toools

**Find the right tools for your entire workflow.**

[Live site](https://toools.dev) · [Submit a tool](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml) · [Browse issues](https://github.com/korbinjoe/toools/issues)

Toools is an open-source **tool stack curation platform** — not just a directory. Start from a workflow (Stacks) or browse individual tools (Browse), then land on rich detail pages to compare pricing, signals, and alternatives before visiting the official site.

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
- **Editor's Picks** — Hand-curated featured tools ranked by GitHub stars, Product Hunt votes, and views
- **Rich tool pages** — About, use cases, pros & cons, alternatives, and an *At a Glance* sidebar (pricing, platforms, open source, signals, freshness)
- **Trust signals** — GitHub stars, Product Hunt votes, featured badges, view/click counts, and source links on cards and detail pages
- **Click tracking** — Outbound visits go through `/api/tools/[slug]/out` to increment click counts before redirecting

### Community & data

- **Community submissions** — Structured GitHub Issue template and in-app guide at [toools.dev/submit](https://toools.dev/submit)
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
| `NEXT_PUBLIC_BASE_URL` | No | Public site URL (defaults to `https://toools.dev`) |

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
│   ├── page.tsx              # Home — hero, Popular Stacks, Editor's Picks, Recently Added
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
├── seed-stacks.ts            # Four curated workflows with stage recommendations
└── seed-tool-enrichments.ts  # Use cases, pros, cons for select tools
scripts/                      # Import and maintenance scripts
openspec/                     # Design proposals and change specs
```

Site navigation: **Stacks · Browse · Categories · Submit**

## Contributing

### Submit a tool

The easiest way to contribute is to [open a tool submission issue](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml). Fill in the template with the tool name, URL, tagline, description, category, and pricing. Maintainers review and approve submissions. You can also start from the in-app submit page at [toools.dev/submit](https://toools.dev/submit).

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
