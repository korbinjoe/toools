import test from "node:test";
import assert from "node:assert/strict";
import type { PrismaClient, ToolStatus } from "@prisma/client";
import { CatalogPublication } from "./catalog-publication";
import { ImportStore, type ImportCandidate } from "./import-store";
import { IndeterminateWriteError, type NeonHttpWriter } from "./neon-http-writer";

const candidate: ImportCandidate = {
  name: "Example", url: "https://example.com", description: "A useful tool",
  categoryHints: ["automation"], categorySlug: "automation", githubStars: 456,
  discovery: { source: "MANUAL", method: "fixture", sourceKey: "example", sourceUrl: "https://editor.example/tools" },
};
const categories = new Map([["automation", "category"]]);
const secret = "a-test-only-secret-at-least-32-characters";
function tool(status: ToolStatus) {
  return { id: "tool", slug: "example", url: candidate.url, github: null, source: "MANUAL" as const, sourceUrl: candidate.discovery.sourceUrl, status, githubStars: 123, phVotes: null, identities: [] };
}
function publication(missing = false) {
  let calls = 0;
  return {
    instance: new CatalogPublication({
      environment: () => missing ? { DATABASE_URL: "postgresql://remote.example/toools" } : { REVALIDATION_SECRET: secret, CACHE_REVALIDATION_URL: "https://example.com/api/revalidate" },
      refresh: async () => { calls++; },
    }),
    calls: () => calls,
  };
}

test("Neon HTTP new pending imports need no refresh credentials and do not trigger invalidation", async () => {
  const published = publication(true);
  let writes = 0;
  const writer: Pick<NeonHttpWriter, "persist"> = {
    persist: async () => { writes++; return { tool: tool("PENDING"), keys: ["url:example.com"], created: true }; },
  };
  const store = new ImportStore({} as PrismaClient, categories, [], writer, published.instance);
  assert.equal((await store.ingest(candidate)).status, "PENDING");
  await store.publication.refresh();
  assert.equal(writes, 1);
  assert.equal(published.calls(), 0);
});

test("Neon HTTP known approved updates preflight configuration before the writer is called", async () => {
  const published = publication(true);
  let writes = 0;
  const writer: Pick<NeonHttpWriter, "persist"> = {
    persist: async () => { writes++; return { tool: tool("APPROVED"), keys: ["url:example.com"], created: false }; },
  };
  const store = new ImportStore({} as PrismaClient, categories, [tool("APPROVED")], writer, published.instance);
  await assert.rejects(store.ingest(candidate), /REVALIDATION_SECRET/);
  await store.publication.refresh();
  assert.equal(writes, 0);
  assert.equal(published.calls(), 0);
});

test("Neon HTTP approved updates invalidate once after several committed transactions", async () => {
  const published = publication();
  let writes = 0;
  const writer: Pick<NeonHttpWriter, "persist"> = {
    persist: async () => { writes++; return { tool: tool("APPROVED"), keys: ["url:example.com"], created: false }; },
  };
  const store = new ImportStore({} as PrismaClient, categories, [tool("APPROVED")], writer, published.instance);
  await store.ingest(candidate);
  await store.ingest(candidate);
  assert.equal(writes, 2);
  assert.equal(published.calls(), 0);
  await store.publication.refresh();
  assert.equal(published.calls(), 1);
});

function pgFixture(status: ToolStatus, rollback = false) {
  let writes = 0;
  const existing = tool(status);
  const transaction = {
    $executeRaw: async () => 1,
    toolIdentity: {
      findMany: async () => [],
      upsert: async () => ({ toolId: existing.id }),
    },
    tool: {
      findUniqueOrThrow: async () => existing,
      update: async () => { writes++; return { ...existing, githubStars: candidate.githubStars! }; },
    },
    toolDiscovery: { upsert: async () => undefined },
  };
  const client = { $transaction: async (callback: (tx: typeof transaction) => Promise<unknown>) => {
    const result = await callback(transaction);
    if (rollback) throw new Error("transaction rolled back");
    return result;
  } } as unknown as PrismaClient;
  return { client, existing, writes: () => writes };
}

test("PostgreSQL pending updates remain usable without cache credentials", async () => {
  const fixture = pgFixture("PENDING");
  const published = publication(true);
  const store = new ImportStore(fixture.client, categories, [fixture.existing], undefined, published.instance);
  await store.ingest(candidate);
  await store.publication.refresh();
  assert.equal(fixture.writes(), 1);
  assert.equal(published.calls(), 0);
});

test("PostgreSQL approved updates preflight inside the transaction before changing public content", async () => {
  const fixture = pgFixture("APPROVED");
  const published = publication(true);
  const store = new ImportStore(fixture.client, categories, [fixture.existing], undefined, published.instance);
  await assert.rejects(store.ingest(candidate), /REVALIDATION_SECRET/);
  await store.publication.refresh();
  assert.equal(fixture.writes(), 0);
  assert.equal(published.calls(), 0);
});

test("PostgreSQL rollback never schedules publication invalidation", async () => {
  const fixture = pgFixture("APPROVED", true);
  const published = publication();
  const store = new ImportStore(fixture.client, categories, [fixture.existing], undefined, published.instance);
  await assert.rejects(store.ingest(candidate), /transaction rolled back/);
  await store.publication.refresh();
  assert.equal(fixture.writes(), 1);
  assert.equal(published.calls(), 0);
});

test("repeat discovery without public field changes does not require credentials or invalidate either transport", async () => {
  const fixture = pgFixture("APPROVED");
  fixture.existing.githubStars = candidate.githubStars!;
  const pgPublication = publication(true);
  const pgStore = new ImportStore(fixture.client, categories, [fixture.existing], undefined, pgPublication.instance);
  await pgStore.ingest(candidate);
  await pgStore.publication.refresh();
  assert.equal(fixture.writes(), 0);
  assert.equal(pgPublication.calls(), 0);

  const httpPublication = publication(true);
  const writer: Pick<NeonHttpWriter, "persist"> = {
    persist: async () => ({ tool: fixture.existing, keys: ["url:example.com"], created: false, publicChanged: false }),
  };
  const httpStore = new ImportStore({} as PrismaClient, categories, [fixture.existing], writer, httpPublication.instance);
  await httpStore.ingest(candidate);
  await httpStore.publication.refresh();
  assert.equal(httpPublication.calls(), 0);
});

test("indeterminate HTTP writes expire only potentially changed public content", async () => {
  const writer: Pick<NeonHttpWriter, "persist"> = { persist: async () => { throw new IndeterminateWriteError(); } };
  const pending = publication(true);
  const pendingStore = new ImportStore({} as PrismaClient, categories, [], writer, pending.instance);
  await assert.rejects(pendingStore.ingest(candidate), IndeterminateWriteError);
  await pendingStore.publication.refresh();
  assert.equal(pending.calls(), 0);

  const approved = publication();
  const approvedStore = new ImportStore({} as PrismaClient, categories, [tool("APPROVED")], writer, approved.instance);
  await assert.rejects(approvedStore.ingest(candidate), IndeterminateWriteError);
  await approvedStore.publication.refresh();
  assert.equal(approved.calls(), 1);
});
