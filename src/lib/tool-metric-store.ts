import { prisma } from "./db";
import { applyToolMetricBatch, metricReceiptCleanupQuery, type MetricDatabase } from "./tool-metric-batches";
import type { ToolMetricEvent } from "./metric-event";

const database: MetricDatabase = {
  transaction: (run) => prisma.$transaction((transaction) => run({
    query: (query) => transaction.$queryRaw(query),
    execute: (query) => transaction.$executeRaw(query),
  }), { maxWait: 5_000, timeout: 20_000 }),
};

export function persistToolMetricEvents(events: ToolMetricEvent[]) {
  return applyToolMetricBatch(database, events);
}

export function pruneToolMetricReceipts() {
  return prisma.$executeRaw(metricReceiptCleanupQuery());
}
