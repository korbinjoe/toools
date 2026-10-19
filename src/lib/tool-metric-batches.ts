import { Prisma } from "@prisma/client";
import { isToolMetricEvent, type ToolMetricEvent } from "./metric-event";

export const METRIC_RECEIPT_RETENTION_MS = 14 * 24 * 60 * 60 * 1_000;

export type MetricTransaction = {
  query<T>(query: Prisma.Sql): Promise<T[]>;
  execute(query: Prisma.Sql): Promise<number>;
};

export type MetricDatabase = {
  transaction<T>(run: (transaction: MetricTransaction) => Promise<T>): Promise<T>;
};

export type MetricBatchResult = { received: number; applied: number; toolsUpdated: number };

type Receipt = { id: string; toolId: string; metric: string; occurredAt: string };

export async function applyToolMetricBatch(
  database: MetricDatabase,
  inputs: readonly ToolMetricEvent[],
  now = Date.now(),
): Promise<MetricBatchResult> {
  if (inputs.length > 1_000) throw new RangeError("Metric batch exceeds 1000 events");
  const unique = new Map<string, ToolMetricEvent>();
  for (const event of inputs) {
    if (!isToolMetricEvent(event)) throw new TypeError("Invalid tool metric event");
    const timestamp = Date.parse(event.occurredAt);
    if (timestamp < now - METRIC_RECEIPT_RETENTION_MS || timestamp > now + 5 * 60_000) {
      throw new RangeError("Metric event is outside its retention window");
    }
    const previous = unique.get(event.id);
    if (previous && !sameEvent(previous, event)) throw new Error("Conflicting metric event ID");
    unique.set(event.id, event);
  }
  if (unique.size === 0) return { received: 0, applied: 0, toolsUpdated: 0 };
  // Stable insertion order also avoids opposite receipt-lock order on retries.
  const events = [...unique.values()].sort((a, b) => a.id.localeCompare(b.id));
  return database.transaction(async (transaction) => {
    const inserted = await transaction.query<{ id: string }>(Prisma.sql`
      INSERT INTO "ToolMetricReceipt" ("id", "toolId", "metric", "occurredAt")
      VALUES ${Prisma.join(events.map((event) => Prisma.sql`(
        ${event.id}, ${event.toolId}, ${event.metric}, ${event.occurredAt}::timestamp(3)
      )`))}
      ON CONFLICT ("id") DO NOTHING RETURNING "id"
    `);
    const receipts = await transaction.query<Receipt>(Prisma.sql`
      SELECT "id", "toolId", "metric",
        to_char("occurredAt", 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "occurredAt"
      FROM "ToolMetricReceipt"
      WHERE "id" IN (${Prisma.join(events.map((event) => event.id))})
    `);
    for (const receipt of receipts) {
      const expected = unique.get(receipt.id)!;
      if (receipt.toolId !== expected.toolId || receipt.metric !== expected.metric ||
          receipt.occurredAt !== expected.occurredAt) {
        throw new Error("Conflicting persisted metric event ID");
      }
    }
    if (receipts.length !== events.length) throw new Error("Incomplete metric receipt transaction");
    const newlyApplied = new Set(inserted.map(({ id }) => id));
    const totals = new Map<string, { views: number; clicks: number }>();
    for (const event of events) {
      if (!newlyApplied.has(event.id)) continue;
      const counts = totals.get(event.toolId) ?? { views: 0, clicks: 0 };
      if (event.metric === "view") counts.views += 1;
      else counts.clicks += 1;
      totals.set(event.toolId, counts);
    }
    let toolsUpdated = 0;
    if (totals.size) {
      // Raw SQL intentionally leaves the editorial @updatedAt timestamp alone.
      toolsUpdated = await transaction.execute(Prisma.sql`
        UPDATE "Tool" AS tool
        SET "viewCount" = tool."viewCount" + delta.views,
            "clickCount" = tool."clickCount" + delta.clicks
        FROM (VALUES ${Prisma.join([...totals.entries()].sort(([a], [b]) => a.localeCompare(b))
          .map(([id, counts]) => Prisma.sql`(${id}, ${counts.views}::integer, ${counts.clicks}::integer)`))})
          AS delta(id, views, clicks)
        WHERE tool."id" = delta.id
      `);
    }
    return { received: inputs.length, applied: inserted.length, toolsUpdated };
  });
}

export function metricReceiptCleanupQuery(now = Date.now()) {
  const cutoff = new Date(now - METRIC_RECEIPT_RETENTION_MS).toISOString();
  // Keep recent arrivals even if their original occurrence is seven days old.
  return Prisma.sql`DELETE FROM "ToolMetricReceipt" WHERE "appliedAt" < ${cutoff}::timestamp(3) AND "occurredAt" < ${cutoff}::timestamp(3)`;
}

function sameEvent(left: ToolMetricEvent, right: ToolMetricEvent) {
  return left.toolId === right.toolId && left.metric === right.metric && left.occurredAt === right.occurredAt;
}
