import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import { applyToolMetricBatch, metricReceiptCleanupQuery, METRIC_RECEIPT_RETENTION_MS, type MetricDatabase } from "./tool-metric-batches";
import type { ToolMetricEvent } from "./metric-event";

test("receipt migration and counter transactions preserve totals through retries and failures", async (t) => {
  const postgres = new PGlite();
  const migrations = (await fs.readdir("prisma/migrations", { withFileTypes: true }))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  for (const migration of migrations) {
    await postgres.exec(await fs.readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
  }
  await postgres.exec(`
    INSERT INTO "Category" (id,name,slug) VALUES ('category','Category','category');
    INSERT INTO "Tool" (id,name,slug,tagline,description,url,"categoryId","updatedAt")
      VALUES ('tool-a','A','a','A','A','https://a.example','category','2026-10-01'),
             ('tool-b','B','b','B','B','https://b.example','category','2026-10-01');
  `);
  const database: MetricDatabase = {
    transaction: (run) => postgres.transaction(async (transaction) => run({
      query: async <T>(query: Prisma.Sql) => (await transaction.query(query.text, query.values)).rows as T[],
      execute: async (query) => (await transaction.query(query.text, query.values)).affectedRows ?? 0,
    })),
  };
  const now = Date.now();
  const event = (id: string, metric: ToolMetricEvent["metric"] = "view", toolId = "tool-a"): ToolMetricEvent => ({
    id, metric, toolId, occurredAt: new Date(now).toISOString(),
  });
  const counts = async (id = "tool-a") => (await postgres.query<{viewCount: number; clickCount: number; updatedAt: Date}>(
    'SELECT "viewCount", "clickCount", "updatedAt" FROM "Tool" WHERE id = $1', [id],
  )).rows[0];
  const originalContentTimestamp = (await counts()).updatedAt;
  try {
    await t.test("aggregates both metrics and leaves editorial timestamps unchanged", async () => {
      const result = await applyToolMetricBatch(database, [event("view-1"), event("view-2"), event("click-1", "click"), event("b-1", "view", "tool-b")], now);
      assert.deepEqual(result, { received: 4, applied: 4, toolsUpdated: 2 });
      assert.deepEqual(await counts(), { viewCount: 2, clickCount: 1, updatedAt: originalContentTimestamp });
      assert.equal((await counts("tool-b")).viewCount, 1);
    });
    await t.test("acknowledgment loss, duplicate envelopes, and overlapping batches apply each ID once", async () => {
      assert.equal((await applyToolMetricBatch(database, [event("view-1"), event("click-1", "click")], now)).applied, 0);
      assert.equal((await applyToolMetricBatch(database, [event("view-3"), event("view-3"), event("view-1")], now)).applied, 1);
      await Promise.all([
        applyToolMetricBatch(database, [event("overlap-1"), event("overlap-2")], now),
        applyToolMetricBatch(database, [event("overlap-2"), event("overlap-3")], now),
      ]);
      assert.equal((await counts()).viewCount, 6);
      assert.equal((await counts()).clickCount, 1);
    });
    await t.test("a counter failure rolls back receipts so redelivery can recover", async () => {
      await postgres.exec('UPDATE "Tool" SET "viewCount" = 2147483647 WHERE id = \'tool-b\'');
      await assert.rejects(applyToolMetricBatch(database, [event("overflow", "view", "tool-b")], now));
      assert.equal((await postgres.query('SELECT id FROM "ToolMetricReceipt" WHERE id = \'overflow\'')).rows.length, 0);
      await postgres.exec('UPDATE "Tool" SET "viewCount" = 1 WHERE id = \'tool-b\'');
      assert.equal((await applyToolMetricBatch(database, [event("overflow", "view", "tool-b")], now)).applied, 1);
      assert.equal((await counts("tool-b")).viewCount, 2);
    });
    await t.test("conflicting IDs cannot corrupt counters or partially apply another event", async () => {
      await assert.rejects(applyToolMetricBatch(database, [event("view-1", "click"), event("conflict-sibling")], now), /Conflicting persisted/);
      await assert.rejects(applyToolMetricBatch(database, [event("duplicate-conflict"), event("duplicate-conflict", "click")], now), /Conflicting metric/);
      assert.equal((await postgres.query('SELECT id FROM "ToolMetricReceipt" WHERE id = \'conflict-sibling\'')).rows.length, 0);
      assert.equal((await counts()).viewCount, 6);
    });
    await t.test("deleted tools do not block acknowledgment of already accepted events", async () => {
      assert.deepEqual(await applyToolMetricBatch(database, [event("deleted-event", "click", "deleted-tool")], now), { received: 1, applied: 1, toolsUpdated: 0 });
      assert.equal((await applyToolMetricBatch(database, [event("deleted-event", "click", "deleted-tool")], now)).applied, 0);
    });
    await t.test("receipt cleanup cannot make an expired event count again", async () => {
      const old = new Date(now - METRIC_RECEIPT_RETENTION_MS - 60_000);
      await postgres.query('INSERT INTO "ToolMetricReceipt" (id,"toolId",metric,"occurredAt","appliedAt") VALUES ($1,$2,$3,$4,$4)', ["expired", "tool-a", "view", old]);
      const cleanup = metricReceiptCleanupQuery(now);
      assert.equal((await postgres.query(cleanup.text, cleanup.values)).affectedRows, 1);
      await assert.rejects(applyToolMetricBatch(database, [{ ...event("expired"), occurredAt: old.toISOString() }], now), /retention window/);
      assert.equal((await counts()).viewCount, 6);
    });
    await t.test("empty batches never open a database transaction", async () => {
      assert.deepEqual(await applyToolMetricBatch({ transaction: async () => { throw new Error("must not connect"); } }, [], now), { received: 0, applied: 0, toolsUpdated: 0 });
    });
  } finally {
    await postgres.close();
  }
});
