import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ImportStore, type ImportCandidate } from './import-store';
import { IMPORT_FUNCTION_SQL, httpImportPayload, type NeonHttpWriter } from './neon-http-writer';

const connectionString = process.env.TOOOLS_TEST_DATABASE_URL;
const enabled = Boolean(connectionString);
let prisma: PrismaClient;
before(async () => {
  if (!connectionString) return;
  const url = new URL(connectionString);
  assert(['127.0.0.1', 'localhost'].includes(url.hostname) && url.pathname === '/toools_import_test', 'Integration tests require the isolated loopback toools_import_test database');
  prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
  await prisma.tool.deleteMany();
  await prisma.category.upsert({ where: { slug: 'automation' }, update: {}, create: { name: 'Automation', slug: 'automation' } });
});
after(async () => { await prisma?.$disconnect(); });

function candidate(name: string, sourceKey: string = 'topic:automation'): ImportCandidate {
  return {
    name, url: `https://${name.toLowerCase()}.example`, description: 'Workflow automation',
    github: `https://github.com/test/${name.toLowerCase()}`, repositoryId: name,
    categoryHints: ['automation'], categorySlug: 'automation', githubStars: 123,
    discovery: { source: 'GITHUB_REPOSITORY', method: 'topic', sourceKey, sourceUrl: 'https://github.com/topics/automation', metadata: { test: true } },
  };
}

test('real database imports are PENDING, repeat imports are idempotent, and discovery dates and primary sources survive', { skip: !enabled }, async () => {
  process.env.PH_AUTO_APPROVE = 'true'; process.env.AWESOME_AUTO_APPROVE = 'true';
  const store = await ImportStore.connect(prisma);
  const first = await store.ingest(candidate('Repeat'));
  assert.equal(first.status, 'PENDING');
  const firstDiscovery = await prisma.toolDiscovery.findFirstOrThrow({ where: { toolId: first.toolId } });
  await store.ingest(candidate('Repeat'));
  assert.equal(await prisma.toolDiscovery.count({ where: { toolId: first.toolId } }), 1);
  const again = await prisma.toolDiscovery.findFirstOrThrow({ where: { toolId: first.toolId } });
  assert.equal(again.firstSeenAt.getTime(), firstDiscovery.firstSeenAt.getTime());
  assert(again.lastSeenAt >= firstDiscovery.lastSeenAt);
  await store.ingest({ ...candidate('Repeat'), phVotes: 500, discovery: { source: 'PRODUCT_HUNT', method: 'product-hunt-topic', sourceKey: 'post-1', sourceUrl: 'https://www.producthunt.com/posts/repeat' } });
  const tool = await prisma.tool.findUniqueOrThrow({ where: { id: first.toolId } });
  assert.equal(tool.source, 'GITHUB_REPOSITORY');
  assert.equal(tool.sourceUrl, 'https://github.com/topics/automation');
  assert.equal(tool.phVotes, 500);
  assert.equal(await prisma.toolDiscovery.count({ where: { toolId: first.toolId } }), 2);
  assert.equal(await prisma.toolIdentity.count({ where: { toolId: first.toolId } }), 3);
  await store.ingest({ ...candidate('Repeat'), phVotes: 50, discovery: { source: 'PRODUCT_HUNT', method: 'product-hunt-topic', sourceKey: 'post-2', sourceUrl: 'https://www.producthunt.com/posts/repeat-2' } });
  assert.equal((await prisma.tool.findUniqueOrThrow({ where: { id: first.toolId } })).phVotes, 500);
  const lowerVoteSource = await prisma.toolDiscovery.findFirstOrThrow({ where: { toolId: first.toolId, sourceKey: 'post-2' } });
  assert.equal((lowerVoteSource.metadata as { phVotes: number }).phVotes, 50);
  delete process.env.PH_AUTO_APPROVE; delete process.env.AWESOME_AUTO_APPROVE;
});

test('legacy website and GitHub URL match without creating tools or changing editorial fields and moderation', { skip: !enabled }, async () => {
  const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'automation' } });
  for (const status of ['APPROVED', 'REJECTED', 'PENDING'] as const) {
    const name = `Legacy${status}`;
    const input = candidate(name);
    const existing = await prisma.tool.create({ data: { name, slug: name.toLowerCase(), description: 'Handwritten description', tagline: 'Editor tagline', url: input.url + '/', github: input.github, categoryId: category.id, status, featured: true, source: 'MANUAL', sourceUrl: 'https://editor.example/selection' } });
    const store = await ImportStore.connect(prisma);
    const result = await store.ingest(input);
    assert.equal(result.toolId, existing.id);
    assert.equal(result.action, 'updated');
    const saved = await prisma.tool.findUniqueOrThrow({ where: { id: existing.id } });
    assert.equal(saved.status, status);
    assert.equal(saved.featured, true);
    assert.equal(saved.description, 'Handwritten description');
    assert.equal(saved.source, 'MANUAL');
    assert.equal(saved.sourceUrl, 'https://editor.example/selection');
  }
});

test('independent importer processes safely converge via transaction identity claims', { skip: !enabled }, async () => {
  const one = await ImportStore.connect(prisma);
  const two = await ImportStore.connect(prisma);
  const results = await Promise.all([one.ingest(candidate('Concurrent', 'source-one')), two.ingest(candidate('Concurrent', 'source-two'))]);
  assert.equal(results[0].toolId, results[1].toolId);
  assert.equal(results.filter((r) => r.action === 'created').length, 1);
  assert.equal(await prisma.toolDiscovery.count({ where: { toolId: results[0].toolId } }), 2);
});

test('repository IDs preserve deduplication through renames and homepage changes', { skip: !enabled }, async () => {
  const store = await ImportStore.connect(prisma);
  const input = candidate('Rename');
  const first = await store.ingest(input);
  const renamed = await store.ingest({ ...input, name: 'Renamed', url: 'https://renamed.example', github: 'https://github.com/new-owner/renamed' });
  assert.equal(renamed.toolId, first.toolId);
  const restarted = await ImportStore.connect(prisma);
  const original = await restarted.ingest(input);
  assert.equal(original.toolId, first.toolId);
  assert.equal(await prisma.toolIdentity.count({ where: { toolId: first.toolId } }), 5);
});

test('conflicting website and repository aliases roll back the whole import and keep separate tools', { skip: !enabled }, async () => {
  const store = await ImportStore.connect(prisma);
  const one = await store.ingest(candidate('ConflictOne'));
  const two = await store.ingest(candidate('ConflictTwo'));
  const discoveriesBefore = await prisma.toolDiscovery.count();
  await assert.rejects(store.ingest({ ...candidate('ConflictTwo'), url: candidate('ConflictOne').url }), /matches multiple/);
  await assert.rejects(store.ingest({ ...candidate('ConflictOne'), github: 'https://github.com/test/different', repositoryId: 'Different' }), /different repositories/);
  assert.equal(await prisma.toolDiscovery.count(), discoveriesBefore);
  assert.notEqual(one.toolId, two.toolId);
});

test('non-Latin names get stable fallback slugs and collisions remain distinct', { skip: !enabled }, async () => {
  const store = await ImportStore.connect(prisma);
  const first = await store.ingest({ ...candidate('UnicodeOne'), name: '工具' });
  const second = await store.ingest({ ...candidate('UnicodeTwo'), name: '도구' });
  assert.equal(first.slug, 'tool');
  assert.equal(second.slug, 'tool-2');
});

test('upgrade migration preserves legacy source provenance without pretending the old timestamp is known', { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query('CREATE SCHEMA migration_fixture');
    await client.query('SET search_path TO migration_fixture');
    const migrations = (await readdir('prisma/migrations')).filter((name) => /^\d/.test(name)).sort();
    for (const name of migrations.filter((name) => name !== '20261014090000_add_import_provenance')) await client.query(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
    await client.query(`INSERT INTO "Category" (id,name,slug) VALUES ('category','Automation','automation')`);
    await client.query(`INSERT INTO "Tool" (id,name,slug,tagline,description,url,"categoryId","updatedAt",source,"sourceUrl") VALUES ('legacy','Legacy','legacy','Legacy','Legacy','https://legacy.example','category',NOW(),'PRODUCT_HUNT','https://www.producthunt.com/posts/legacy')`);
    await client.query(await readFile('prisma/migrations/20261014090000_add_import_provenance/migration.sql', 'utf8'));
    const result = await client.query('SELECT * FROM "ToolDiscovery"');
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].toolId, 'legacy');
    assert.equal(result.rows[0].source, 'PRODUCT_HUNT');
    assert.equal(result.rows[0].metadata.historicalDiscoveryTimeUnknown, true);
  } finally {
    await client.query('SET search_path TO public');
    await client.query('DROP SCHEMA IF EXISTS migration_fixture CASCADE');
    client.release();
    await pool.end();
  }
});

test('Neon HTTP transaction SQL preserves PENDING, moderation, primary sources and per-source snapshots', { skip: !enabled }, async () => {
  const pool = new Pool({ connectionString });
  const writer: Pick<NeonHttpWriter, 'persist'> = { persist: async (...args) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(IMPORT_FUNCTION_SQL);
      const result = await client.query('SELECT pg_temp.toools_import_candidate($1::jsonb) AS result', [JSON.stringify(httpImportPayload(...args))]);
      await client.query('DROP FUNCTION pg_temp.toools_import_candidate(jsonb)');
      await client.query('COMMIT');
      return result.rows[0].result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } };
  try {
    const store = await ImportStore.connect(prisma, writer);
    const first = await store.ingest(candidate('HttpRepeat'));
    assert.equal(first.status, 'PENDING');
    await prisma.tool.update({ where: { id: first.toolId }, data: { status: 'APPROVED', description: 'Curated description', featured: true } });
    const initial = await prisma.toolDiscovery.findFirstOrThrow({ where: { toolId: first.toolId } });
    await store.ingest(candidate('HttpRepeat'));
    const ph = { ...candidate('HttpRepeat'), phVotes: 500, discovery: { source: 'PRODUCT_HUNT' as const, method: 'product-hunt-topic', sourceKey: 'http-post-1', sourceUrl: 'https://www.producthunt.com/posts/http-repeat' } };
    await store.ingest(ph);
    await store.ingest({ ...ph, phVotes: 50, discovery: { ...ph.discovery, sourceKey: 'http-post-2' } });
    const saved = await prisma.tool.findUniqueOrThrow({ where: { id: first.toolId } });
    assert.equal(saved.status, 'APPROVED');
    assert.equal(saved.description, 'Curated description');
    assert.equal(saved.featured, true);
    assert.equal(saved.source, 'GITHUB_REPOSITORY');
    assert.equal(saved.phVotes, 500);
    const repeated = await prisma.toolDiscovery.findFirstOrThrow({ where: { id: initial.id } });
    assert.equal(repeated.firstSeenAt.getTime(), initial.firstSeenAt.getTime());
    assert.equal(await prisma.toolDiscovery.count({ where: { toolId: first.toolId } }), 3);
    const lower = await prisma.toolDiscovery.findFirstOrThrow({ where: { toolId: first.toolId, sourceKey: 'http-post-2' } });
    assert.equal((lower.metadata as { phVotes: number }).phVotes, 50);

    const rename = await store.ingest({ ...candidate('HttpRepeat'), github: 'https://github.com/new/http-renamed', url: 'https://http-renamed.example' });
    assert.equal(rename.toolId, first.toolId);
    assert.equal(await prisma.toolIdentity.count({ where: { toolId: first.toolId } }), 5);
    const countBefore = await prisma.tool.count();
    await assert.rejects(store.ingest({ ...candidate('HttpRepeat'), github: 'https://github.com/test/other-http', repositoryId: 'other-http' }), /Identity conflict/);
    assert.equal(await prisma.tool.count(), countBefore);

    const one = await ImportStore.connect(prisma, writer);
    const two = await ImportStore.connect(prisma);
    const concurrent = await Promise.all([one.ingest(candidate('HttpConcurrent', 'http-source')), two.ingest(candidate('HttpConcurrent', 'pg-source'))]);
    assert.equal(concurrent[0].toolId, concurrent[1].toolId);
    assert.equal(concurrent.filter(r => r.action === 'created').length, 1);
    assert.equal(await prisma.toolDiscovery.count({ where: { toolId: concurrent[0].toolId } }), 2);

    const category = await prisma.category.findUniqueOrThrow({ where: { slug: 'automation' } });
    for (const [index, legacyGithub] of ['https://github.com/test/old?tab=readme-ov-file', 'https://github.com/test/old#readme', 'https://www.github.com:443/Test//Old.git///#readme'].entries()) {
      const input = candidate(`HttpLegacy${index}`);
      const legacy = await prisma.tool.create({ data: { name: input.name, slug: input.name.toLowerCase(), tagline: 'Legacy', description: 'Curated', url: input.url, github: legacyGithub, categoryId: category.id, status: 'APPROVED', source: 'MANUAL' } });
      const legacyStore = await ImportStore.connect(prisma, writer);
      await assert.rejects(legacyStore.ingest(input), /different GitHub repository/);
      assert.equal(await prisma.toolIdentity.count({ where: { toolId: legacy.id } }), 0);
      assert.equal((await prisma.tool.findUniqueOrThrow({ where: { id: legacy.id } })).description, 'Curated');
    }
    const incomingUrl = 'https://github.com/test/http-url-only';
    const urlOnly = await prisma.tool.create({ data: { name: 'Http URL only', slug: 'http-url-only', tagline: 'Legacy', description: 'Curated', url: incomingUrl, github: 'https://github.com/test/old#readme', categoryId: category.id } });
    const urlStore = await ImportStore.connect(prisma, writer);
    await assert.rejects(urlStore.ingest({ ...candidate('HttpUrlOnly'), url: incomingUrl, github: undefined }), /different GitHub repository/);
    assert.equal(await prisma.toolIdentity.count({ where: { toolId: urlOnly.id } }), 0);

    // Replay the exact operation payload, as when the commit response was lost.
    const replayCandidate = candidate('HttpResponseReplay');
    const payload = httpImportPayload(replayCandidate, ['url:httpresponsereplay.example', 'repo:test/httpresponsereplay', 'github-id:HttpResponseReplay'], [], [], category.id, 'httpresponsereplay');
    const client = await pool.connect();
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        await client.query('BEGIN');
        await client.query(IMPORT_FUNCTION_SQL);
        const replay = await client.query('SELECT pg_temp.toools_import_candidate($1::jsonb) AS result', [JSON.stringify(payload)]);
        await client.query('DROP FUNCTION pg_temp.toools_import_candidate(jsonb)');
        await client.query('COMMIT');
        assert.equal(replay.rows[0].result.created, true);
        assert.equal(replay.rows[0].result.tool.id, payload.newId);
      }
      assert.equal(await prisma.tool.count({ where: { id: payload.newId } }), 1);
      assert.equal(await prisma.toolDiscovery.count({ where: { toolId: payload.newId } }), 1);
      const discovery = await prisma.toolDiscovery.findFirstOrThrow({ where: { toolId: payload.newId } });
      assert(discovery.lastSeenAt >= discovery.firstSeenAt);
    } finally { client.release(); }
  } finally { await pool.end(); }
});
