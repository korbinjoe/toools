import 'dotenv/config';
import { parseArgs } from 'node:util';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const { values } = parseArgs({ options: { slug: { type: 'string' }, help: { type: 'boolean', short: 'h' } } });
  if (values.help) { console.log('Usage: npm run sources:inspect -- --slug TOOL_SLUG\nPrints moderation status, identity aliases, and all discovery records as JSON.'); return; }
  if (!values.slug) throw new Error('--slug is required');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });
  try {
    const tool = await prisma.tool.findUnique({ where: { slug: values.slug }, select: {
      id: true, name: true, slug: true, url: true, status: true,
      identities: { orderBy: { key: 'asc' } },
      discoveries: { orderBy: { firstSeenAt: 'asc' } },
    } });
    if (!tool) throw new Error('Tool not found');
    console.log(JSON.stringify(tool, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : 'Source inspection failed'); process.exitCode = 1; });
