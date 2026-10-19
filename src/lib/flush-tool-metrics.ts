import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { CATALOG_METRICS_CACHE_TAG } from "./catalog-cache";
import { consumeMetricQueue, scheduleMetricFlush } from "./metric-queue";
import type { ToolMetricEvent } from "./metric-event";

type PersistenceResult = { received: number; applied: number; toolsUpdated: number };
type FlushOptions = { pruneReceipts?: boolean };

type FlushDependencies = {
  isEnabled?: () => boolean;
  consume?: typeof consumeMetricQueue;
  persist?: (events: ToolMetricEvent[]) => Promise<PersistenceResult>;
  prune?: () => Promise<unknown>;
  invalidate?: () => void;
  schedule?: typeof scheduleMetricFlush;
};

export function createToolMetricFlusher(dependencies: FlushDependencies = {}) {
  const isEnabled = dependencies.isEnabled ?? (() => process.env.TOOL_METRICS_MODE === "queue");
  const consume = dependencies.consume ?? consumeMetricQueue;
  const persist = dependencies.persist ?? (async (events) => {
    const { persistToolMetricEvents } = await import("./tool-metric-store");
    return persistToolMetricEvents(events);
  });
  const prune = dependencies.prune ?? (async () => {
    const { pruneToolMetricReceipts } = await import("./tool-metric-store");
    return pruneToolMetricReceipts();
  });
  const invalidate = dependencies.invalidate ?? (() => revalidateTag(CATALOG_METRICS_CACHE_TAG, { expire: 0 }));
  const schedule = dependencies.schedule ?? scheduleMetricFlush;

  return async function flushToolMetrics(options: FlushOptions = {}) {
    if (!isEnabled()) {
      return { enabled: false, received: 0, acknowledged: 0, applied: 0, toolsUpdated: 0, hasMore: false };
    }
    let applied = 0;
    let toolsUpdated = 0;
    try {
      const result = await consume(async (events) => {
        const persisted = await persist(events);
        applied += persisted.applied;
        toolsUpdated += persisted.toolsUpdated;
        return persisted;
      });
      if (result.hasMore) {
        // Hourly keys may already have been accepted, so continuation uses its
        // own key and starts immediately rather than waiting another hour.
        await schedule({ delaySeconds: 0, idempotencyKey: `continue-${randomUUID()}` });
      }
      if (options.pruneReceipts && result.received > 0) await prune();
      return { enabled: true, ...result, applied, toolsUpdated };
    } finally {
      // A committed batch still changed counts when queue acknowledgments or a
      // continuation send failed. Never leave those successful writes hidden.
      if (applied > 0) invalidate();
    }
  };
}

export const flushToolMetrics = createToolMetricFlusher();
