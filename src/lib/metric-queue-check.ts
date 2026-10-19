import { randomUUID } from "node:crypto";
import { createMetricQueue, type MetricQueueOptions } from "./metric-queue";
import type { ToolMetricEvent } from "./metric-event";

// This diagnostic never shares a topic or cursor with real statistics. Its
// callback validates synthetic events in memory and never imports the DB store.
export const METRIC_CHECK_TOPIC = "toools-metric-validation-v1";
export const METRIC_CHECK_CONSUMER = "toools-metric-validation-reader-v1";
const CANARY_TOOL_ID = "toools-metric-validation-only";
const CANARY_ID_PREFIX = "metric-check-";

type CheckDependencies = {
  queueOptions?: Omit<MetricQueueOptions, "eventTopic" | "consumerGroup">;
  now?: () => number;
  randomId?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
};

export function createMetricQueueCheck(dependencies: CheckDependencies = {}) {
  return async function checkMetricQueue() {
    const now = dependencies.now ?? Date.now;
    const sleep = dependencies.sleep ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
    const queue = createMetricQueue({
      ...dependencies.queueOptions,
      // These values always override injected options as defense in depth.
      eventTopic: METRIC_CHECK_TOPIC, consumerGroup: METRIC_CHECK_CONSUMER,
      maxEvents: 100, maxDurationMs: 10_000,
    });
    const event: ToolMetricEvent = {
      id: `${CANARY_ID_PREFIX}${(dependencies.randomId ?? randomUUID)()}`,
      toolId: CANARY_TOOL_ID, metric: "view", occurredAt: new Date(now()).toISOString(),
    };
    // Publish directly: scheduling a real statistics wake is intentionally absent.
    await queue.publishToolMetricEvent(event);
    const deadline = now() + 60_000;
    for (let attempt = 0; attempt < 20 && now() <= deadline; attempt++) {
      let observed = false;
      const result = await queue.consumeMetricQueue(async (events) => {
        for (const received of events) {
          if (received.toolId !== CANARY_TOOL_ID || !received.id.startsWith(CANARY_ID_PREFIX) || received.metric !== "view") {
            throw new Error("Validation topic contains an unexpected event");
          }
          if (received.id === event.id) {
            if (received.occurredAt !== event.occurredAt) throw new Error("Validation event payload mismatch");
            observed = true;
          }
          // Older canaries are harmless and can be acknowledged. Concurrent
          // checks can fail closed if another check consumes their nonce; the
          // workflow serializes rollout, and a fresh POST starts a fresh check.
        }
      });
      if (observed && result.acknowledged > 0) return { checked: true, isolated: true, producer: true, poll: true, acknowledged: true };
      if (attempt + 1 < 20 && now() < deadline) await sleep(500);
    }
    throw new Error("Isolated metric queue validation did not observe and acknowledge its event");
  };
}

export const checkMetricQueue = createMetricQueueCheck();
