import { checkMetricQueue } from "@/lib/metric-queue-check";
import { createMetricsCheckHandler } from "./handler";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = createMetricsCheckHandler(checkMetricQueue);
