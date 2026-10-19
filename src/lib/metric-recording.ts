import { randomUUID } from "node:crypto";
import type { ToolMetricEvent } from "./metric-event";

type MetricRecorderOptions = {
  mode: () => string | undefined;
  direct: (event: ToolMetricEvent) => Promise<unknown>;
  enqueue: (event: ToolMetricEvent) => Promise<{ accepted: true; wakeScheduled: boolean }>;
  persist: (events: ToolMetricEvent[]) => Promise<unknown>;
  warn: (message: string) => void;
  now?: () => number;
  id?: () => string;
};

export function createMetricRecorder(options: MetricRecorderOptions) {
  return async function record(toolId: string, metric: ToolMetricEvent["metric"]) {
    const event: ToolMetricEvent = {
      id: (options.id ?? randomUUID)(),
      toolId,
      metric,
      occurredAt: new Date((options.now ?? Date.now)()).toISOString(),
    };
    const mode = options.mode();
    if (!mode || mode === "direct") {
      // Compatible with the existing schema until the receipt migration is live.
      await options.direct(event);
      return;
    }
    if (mode !== "queue") throw new Error("Invalid TOOL_METRICS_MODE");
    let result: { accepted: true; wakeScheduled: boolean };
    try {
      result = await options.enqueue(event);
    } catch {
      // Publishing may have succeeded before a timeout. The SAME event ID in the
      // receipt transaction prevents a later queue replay incrementing it twice.
      options.warn("Metric queue publish failed; using deduplicated database fallback");
      await options.persist([event]);
      return;
    }
    if (!result.wakeScheduled) options.warn("Metric event queued; scheduled flush unavailable, daily drain will retry");
  };
}
