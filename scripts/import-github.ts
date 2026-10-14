import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaNeonHttp } from '@prisma/adapter-neon';
import { NeonHttpWriter } from './lib/neon-http-writer';
import { GithubClient } from './lib/github-client';
import { loadSources } from './lib/github-sources';
import { ImportStore } from './lib/import-store';
import { runGithubImport } from './lib/github-import';
import { parseImportOptions } from './lib/import-options';

async function main() {
  const options = parseImportOptions(process.argv.slice(2));
  if (options.help) {
    console.log(`GitHub import (all new tools are PENDING)
  --config PATH             Source config (scripts/config/github-sources.json)
  --mode MODE               all | topics | keywords | organizations | directories
  --limit N                 Total candidate budget (10000)
  --new-limit N             Stop after N new tools; matches/skips do not count
  --transport TRANSPORT     pg (default) | neon-http (Neon HTTPS transactions)
  --max-per-source N        Candidate cap per source, 1..1000 (100)
  --dry-run                 Discover without connecting to or writing a database
  --report PATH             JSON report (reports/imports/github-TIMESTAMP.json)
Dry-run detects duplicates within this run. Database imports also match existing
tools and aliases, preserve moderation, and save every discovery atomically.`);
    return;
  }
  const config = await loadSources(options.config);
  if (!options.dryRun && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; use --dry-run for discovery without a database');
  const httpWriter = !options.dryRun && options.transport === 'neon-http' ? new NeonHttpWriter(process.env.DATABASE_URL!) : undefined;
  const prisma = options.dryRun ? undefined : new PrismaClient({ adapter: httpWriter ? new PrismaNeonHttp(process.env.DATABASE_URL!, {}) : new PrismaPg(process.env.DATABASE_URL!) });
  try {
    const store = prisma ? await ImportStore.connect(prisma, httpWriter) : new ImportStore();
    const client = new GithubClient({ token: process.env.GITHUB_TOKEN });
    const report = await runGithubImport(client, store, config, options);
    const path = options.report || `reports/imports/github-${report.startedAt.replace(/[:.]/g, '-')}.json`;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(report, null, 2) + '\n');
    const count = (outcome: string) => report.records.filter((r) => r.outcome === outcome).length;
    console.log(`${options.dryRun ? 'Dry-run' : 'Import'}: ${count('created')} new, ${count('updated')} matched, ${count('skipped')} skipped, ${report.errors.length} errors. New tools: PENDING.\nReport: ${path}${report.budgetReached ? '\nCandidate budget reached; increase --limit for more coverage.' : ''}${report.newToolLimitReached ? '\nNew-tool limit reached.' : ''}`);
    if (report.errors.length) process.exitCode = 1;
  } finally {
    await prisma?.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'GitHub import failed');
  process.exitCode = 1;
});
