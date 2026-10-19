import { QueueClient } from "@vercel/queue";
import { flushToolMetrics } from "@/lib/flush-tool-metrics";
import { getMetricQueueRegion } from "@/lib/metric-queue";

export const runtime = "nodejs";
export const maxDuration = 300;

// vercel.json makes this a private queue consumer. It has no public URL on
// Vercel, and the official helper acknowledges only after the worker succeeds.
const queue = new QueueClient({ region: getMetricQueueRegion() });
export const POST = queue.handleCallback(async () => {
  await flushToolMetrics();
}, { retry: () => ({ afterSeconds: 60 * 60 }) });
