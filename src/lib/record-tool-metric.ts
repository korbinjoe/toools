import { prisma } from "./db";
import { createMetricRecorder } from "./metric-recording";
import { enqueueToolMetric } from "./metric-queue";
import { persistToolMetricEvents } from "./tool-metric-store";
import { toolMetricQuery } from "./tool-metrics";

const record = createMetricRecorder({
  mode: () => process.env.TOOL_METRICS_MODE,
  direct: (event) => prisma.$executeRaw(toolMetricQuery(event.toolId, event.metric)),
  enqueue: enqueueToolMetric,
  persist: persistToolMetricEvents,
  warn: (message) => console.warn(message),
});

export async function recordToolMetric(toolId: string, metric: "view" | "click") {
  try {
    await record(toolId, metric);
  } catch {
    // No database URL, SQL error body, or queue credential in the public logs.
    console.error("Tool metric could not be recorded", { metric });
  }
}
