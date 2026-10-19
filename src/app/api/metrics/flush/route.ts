import { flushToolMetrics } from "@/lib/flush-tool-metrics";
import { createMetricsCronHandler } from "./handler";

export const runtime = "nodejs";
export const maxDuration = 300;

export const GET = createMetricsCronHandler(() => flushToolMetrics({ pruneReceipts: true }));
