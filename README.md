# Toools

**Discover and use the best tools — curated, searchable, and ready in your browser.**

[Live site](https://toools.dev) · [Submit a tool](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml) · [Browse issues](https://github.com/korbinjoe/toools/issues)

Toools is an open-source tool directory built for discovery and comparison. Browse a curated collection of software across categories, filter by pricing, platform, and trust signals, and try embeddable tools directly on the page.

## Features

- **Curated directory** — Tools organized by category with tags, pricing, and platform metadata
- **Search & filters** — Find tools by name, use case, category, pricing, open-source status, and platform
- **Trust signals** — GitHub stars, Product Hunt votes, featured badges, and click counts surfaced on cards and detail pages
- **In-browser embeds** — Selected tools can be used inline via iframe without leaving the site
- **Community submissions** — Anyone can suggest a tool through a structured GitHub Issue template
- **Bulk import pipeline** — Scripts to seed from Product Hunt and GitHub Awesome lists

## Tech Stack

| Layer | Choices |
|-------|---------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via [Prisma 7](https://www.prisma.io) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
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

### 3. Set up the database

```bash
npx prisma migrate deploy
npx prisma db seed
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
| `npm run build` | Generate Prisma client and build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma db seed` | Seed the database with curated tools |
| `npx prisma studio` | Open Prisma's database GUI |

### Data import scripts

These scripts live in `scripts/` and require `DATABASE_URL` in your environment.

**Product Hunt import**

```bash
PRODUCTHUNT_TOKEN=xxx npx tsx scripts/import-producthunt.ts
```

Get a token at [producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications).

**GitHub Awesome lists import**

```bash
npx tsx scripts/import-awesome-lists.ts
```

Optional: set `GITHUB_TOKEN` for higher API rate limits, and `AWESOME_AUTO_APPROVE=true` to auto-approve imports.

**Other utilities**

```bash
npx tsx scripts/sync-categories.ts    # Sync category definitions
npx tsx scripts/recategorize.ts        # Re-run category matching on existing tools
npx tsx scripts/fix-icons.ts           # Backfill missing favicons
npx tsx scripts/db-stats.ts            # Print database statistics
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages and API routes
├── components/       # UI components (tool cards, filters, layout)
└── lib/              # Database client, utilities, signal helpers
prisma/
├── schema.prisma     # Data model (Tool, Category, Tag)
├── migrations/       # SQL migrations
└── seed.ts           # Seed data (~100 curated tools)
scripts/              # Import and maintenance scripts
```

## Contributing

### Submit a tool

The easiest way to contribute is to [open a tool submission issue](https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml). Fill in the template with the tool name, URL, tagline, description, category, and pricing. Maintainers review and approve submissions.

### Contribute code

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Make your changes and ensure `npm run lint` passes
4. Open a pull request with a clear description of what changed and why

Bug reports and feature suggestions are welcome via [GitHub Issues](https://github.com/korbinjoe/toools/issues).

## Deployment

The app is designed to deploy on [Vercel](https://vercel.com) with a managed PostgreSQL instance. Set `DATABASE_URL` in your deployment environment, then run migrations against the production database:

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npx prisma db seed
```

See `openspec/changes/vercel-deployment/` for detailed deployment notes.

## License

This project is open source. See the repository for license details.
