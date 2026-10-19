import { getVercelOidcToken } from "@vercel/oidc";
import { PollingQueueClient, QueueClient, type SendOptions, type VercelRegion } from "@vercel/queue";
import { parseToolMetricEvent, type ToolMetricEvent } from "./metric-event";

export const METRIC_EVENT_TOPIC = "toools-metric-events-v1";
export const METRIC_FLUSH_TOPIC = "toools-metric-flush-v1";
export const METRIC_CONSUMER_GROUP = "toools-metric-writer-v1";
export const METRIC_RETENTION_SECONDS = 7 * 24 * 60 * 60;

const HOUR_MS = 60 * 60 * 1000;
const RECEIVE_LIMIT = 10;
const PERSIST_BATCH_SIZE = 100;
const LEASE_SECONDS = 300;
const REQUEST_TIMEOUT_MS = 15_000;

type Publish = (topic: string, payload: unknown, options: SendOptions) => Promise<{ messageId: string | null }>;
type Persist = (events: ToolMetricEvent[]) => Promise<unknown>;

export type MetricQueueEnqueueResult = {
  accepted: true;
  messageId: string | null;
  wakeScheduled: boolean;
};

export type MetricQueueConsumeResult = {
  received: number;
  acknowledged: number;
  hasMore: boolean;
};

export type MetricFlushOptions = {
  delaySeconds?: number;
  idempotencyKey?: string;
};

export class MetricQueueEnqueueError extends Error {
  // A transport failure can happen after the service accepts the event. Any
  // direct fallback must use the same database event-ID ledger as the consumer.
  readonly accepted = "unknown" as const;
  constructor(readonly eventId: string) {
    super("Metric event publish failed; queue acceptance is unknown");
    this.name = "MetricQueueEnqueueError";
  }
}

export class MetricQueueConsumeError extends Error {
  constructor(message: string, readonly progress: MetricQueueConsumeResult, readonly status?: number) {
    super(message);
    this.name = "MetricQueueConsumeError";
  }
}

type QueueMessage = {
  messageId: string;
  receiptHandle: string;
  event: ToolMetricEvent;
};

// The injected dependencies keep reliability tests completely offline. Production
// uses the official SDK for publishing and OIDC for the documented receive API.
type MetricQueueOptions = {
  region?: VercelRegion;
  deploymentId?: string;
  publishEvent?: Publish;
  publishWake?: Publish;
  fetch?: typeof fetch;
  getToken?: () => Promise<string>;
  now?: () => number;
  maxEvents?: number;
  maxDurationMs?: number;
};

export function getMetricQueueRegion(): VercelRegion {
  const region = process.env.METRICS_QUEUE_REGION || "iad1";
  if (!/^[a-z]{3}[0-9]$/.test(region)) throw new TypeError("Invalid metric queue region");
  return region as VercelRegion;
}

export function createMetricQueue(options: MetricQueueOptions = {}) {
  const now = options.now ?? Date.now;
  const fetchRequest = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const getToken = options.getToken ?? getVercelOidcToken;
  const maxEvents = options.maxEvents ?? 1_000;
  const maxDurationMs = options.maxDurationMs ?? 200_000;
  if (!Number.isInteger(maxEvents) || maxEvents < 1 || !Number.isFinite(maxDurationMs) || maxDurationMs < 1) {
    throw new TypeError("Invalid metric queue execution budget");
  }
  const region = options.region ?? getMetricQueueRegion();
  if (!/^[a-z]{3}[0-9]$/.test(region)) throw new TypeError("Invalid metric queue region");
  const deploymentId = options.deploymentId ?? process.env.VERCEL_DEPLOYMENT_ID ?? "local";
  // Instantiate lazily: importing this module never authenticates or sends data.
  let eventClient: PollingQueueClient | undefined;
  let wakeClient: QueueClient | undefined;
  const publishEvent: Publish = options.publishEvent ?? ((topic, payload, sendOptions) => {
    eventClient ??= new PollingQueueClient({ region, deploymentId: null });
    return eventClient.send(topic, payload, sendOptions);
  });
  const publishWake: Publish = options.publishWake ?? ((topic, payload, sendOptions) => {
    wakeClient ??= new QueueClient({ region });
    return wakeClient.send(topic, payload, sendOptions);
  });

  async function scheduleMetricFlush(flushOptions: MetricFlushOptions = {}) {
    const currentTime = now();
    const nextHour = Math.floor(currentTime / HOUR_MS) * HOUR_MS + HOUR_MS;
    const delaySeconds = flushOptions.delaySeconds ?? Math.ceil((nextHour + 5_000 - currentTime) / 1_000);
    if (!Number.isInteger(delaySeconds) || delaySeconds < 0 || delaySeconds >= METRIC_RETENTION_SECONDS) {
      throw new TypeError("Invalid metric flush delay");
    }
    const idempotencyKey = flushOptions.idempotencyKey ?? `flush-${deploymentId}-${nextHour}`;
    await publishWake(METRIC_FLUSH_TOPIC, { scheduledFor: new Date(currentTime + delaySeconds * 1_000).toISOString() }, {
      idempotencyKey,
      delaySeconds,
      retentionSeconds: METRIC_RETENTION_SECONDS,
    });
  }

  async function enqueueToolMetric(input: ToolMetricEvent): Promise<MetricQueueEnqueueResult> {
    const event = parseToolMetricEvent(input);
    let messageId: string | null;
    try {
      ({ messageId } = await publishEvent(METRIC_EVENT_TOPIC, event, {
        idempotencyKey: event.id,
        retentionSeconds: METRIC_RETENTION_SECONDS,
      }));
    } catch {
      // Never expose SDK error bodies or OIDC tokens in application logs.
      throw new MetricQueueEnqueueError(event.id);
    }
    try {
      await scheduleMetricFlush();
      return { accepted: true, messageId, wakeScheduled: true };
    } catch {
      // The durable event already exists. A later hourly wake or daily drain can
      // process it; treating this as rejected would cause unsafe direct retries.
      return { accepted: true, messageId, wakeScheduled: false };
    }
  }

  async function consumeMetricQueue(persist: Persist): Promise<MetricQueueConsumeResult> {
    const deadline = now() + maxDurationMs;
    const progress: MetricQueueConsumeResult = { received: 0, acknowledged: 0, hasMore: true };
    const endpoint = `https://${region}.vercel-queue.com/api/v3/topic/${METRIC_EVENT_TOPIC}/consumer/${METRIC_CONSUMER_GROUP}`;

    async function request(url: string, init: RequestInit): Promise<Response> {
      try {
        // The token belongs to the request context and must not be cached.
        const token = await getToken();
        return await fetchRequest(url, {
          ...init,
          headers: { ...init.headers, Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
      } catch {
        throw new MetricQueueConsumeError("Metric queue request failed", { ...progress });
      }
    }

    while (progress.received < maxEvents && now() < deadline) {
      const messages: QueueMessage[] = [];
      let queueEmpty = false;
      // Receives are capped at ten by Vercel. Gather up to 100 for one database
      // transaction; no message is acknowledged during this collection phase.
      while (messages.length < PERSIST_BATCH_SIZE && progress.received < maxEvents && now() < deadline) {
        const limit = Math.min(RECEIVE_LIMIT, maxEvents - progress.received, PERSIST_BATCH_SIZE - messages.length);
        const response = await request(endpoint, {
          method: "POST",
          headers: {
            Accept: "application/x-ndjson",
            "Vqs-Max-Messages": String(limit),
            "Vqs-Visibility-Timeout-Seconds": String(LEASE_SECONDS),
          },
        });
        if (response.status === 204) { queueEmpty = true; break; }
        if (!response.ok) {
          throw new MetricQueueConsumeError("Metric queue receive rejected", { ...progress }, response.status);
        }
        let received: QueueMessage[];
        try {
          received = parseQueueResponse(await response.text());
          if (received.length === 0 || received.length > limit) throw new Error("Invalid receive size");
        } catch {
          // Malformed messages remain unacknowledged for diagnosis and retry.
          throw new MetricQueueConsumeError("Metric queue returned invalid event data", { ...progress });
        }
        progress.received += received.length;
        messages.push(...received);
      }
      if (messages.length > 0) {
        try {
          await persist(messages.map(({ event }) => event));
        } catch {
          throw new MetricQueueConsumeError("Metric batch persistence failed; events remain queued", { ...progress });
        }
        // All database updates committed before the first acknowledgment. If an
        // ack fails, the durable database ledger makes replay safe.
        const acknowledgments = await Promise.allSettled(messages.map(async ({ receiptHandle }) => {
          const response = await request(`${endpoint}/lease/${encodeURIComponent(receiptHandle)}`, { method: "DELETE" });
          // 404 also means already acknowledged according to the API contract.
          if (response.status !== 204 && response.status !== 404) {
            throw new MetricQueueConsumeError("Metric queue acknowledgment rejected", { ...progress }, response.status);
          }
          progress.acknowledged += 1;
        }));
        if (acknowledgments.some(({ status }) => status === "rejected")) {
          throw new MetricQueueConsumeError("Metric queue acknowledgment failed; replay is safe", { ...progress });
        }
      }
      if (queueEmpty) return { ...progress, hasMore: false };
    }
    // The queue may be empty; returning true conservatively schedules a final
    // check when the execution budget prevented us from observing a 204.
    return progress;
  }

  return { enqueueToolMetric, scheduleMetricFlush, consumeMetricQueue };
}

function parseQueueResponse(text: string): QueueMessage[] {
  return text.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
    const message: unknown = JSON.parse(line);
    if (!message || typeof message !== "object") throw new TypeError("Invalid queue envelope");
    const item = message as Record<string, unknown>;
    if (typeof item.messageId !== "string" || !item.messageId || typeof item.receiptHandle !== "string" || !item.receiptHandle) {
      throw new TypeError("Invalid queue message identifiers");
    }
    if (typeof item.body !== "string" || item.body.length > 4_096 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(item.body)) {
      throw new TypeError("Invalid queue message payload");
    }
    return {
      messageId: item.messageId,
      receiptHandle: item.receiptHandle,
      event: parseToolMetricEvent(JSON.parse(Buffer.from(item.body, "base64").toString("utf8"))),
    };
  });
}

// Read deployment/environment settings at invocation time, including in tests
// and local scripts which load their environment after importing modules.
export function enqueueToolMetric(event: ToolMetricEvent) {
  return createMetricQueue().enqueueToolMetric(event);
}

export function scheduleMetricFlush(options?: MetricFlushOptions) {
  return createMetricQueue().scheduleMetricFlush(options);
}

export function consumeMetricQueue(persist: Persist) {
  return createMetricQueue().consumeMetricQueue(persist);
}
