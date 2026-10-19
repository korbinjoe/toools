import assert from "node:assert/strict";
import test from "node:test";
import { PollingQueueClient, QueueClient } from "@vercel/queue";
import { isToolMetricEvent, parseToolMetricEvent, type ToolMetricEvent } from "./metric-event";
import {
  createMetricQueue,
  METRIC_CONSUMER_GROUP,
  METRIC_EVENT_TOPIC,
  METRIC_FLUSH_TOPIC,
  METRIC_RETENTION_SECONDS,
  MetricQueueConsumeError,
  MetricQueueEnqueueError,
} from "./metric-queue";

const event = (index = 1): ToolMetricEvent => ({
  id: `event-${index}`,
  toolId: "tool-1",
  metric: index % 2 ? "view" : "click",
  occurredAt: "2026-10-19T01:10:00.000Z",
});

function envelope(value: unknown, index = 1) {
  return JSON.stringify({
    messageId: `msg-${index}`,
    receiptHandle: `receipt/${index}=`,
    body: Buffer.from(JSON.stringify(value)).toString("base64"),
  });
}

test("metric events reject malformed identifiers, counts and timestamps without rejecting durable backlog", () => {
  assert.equal(isToolMetricEvent(event()), true);
  assert.equal(isToolMetricEvent({ ...event(), occurredAt: "2020-01-01T00:00:00.000Z" }), true);
  for (const value of [
    null, [], {}, { ...event(), id: "" }, { ...event(), toolId: "unsafe\nvalue" },
    { ...event(), metric: "impression" }, { ...event(), occurredAt: "invalid" },
    { ...event(), occurredAt: "2026-02-31T00:00:00.000Z" },
  ]) {
    assert.equal(isToolMetricEvent(value), false);
    assert.throws(() => parseToolMetricEvent(value), TypeError);
  }
  assert.deepEqual(parseToolMetricEvent({ ...event(), ignored: "not serialized" }), event());
});

test("publishing accepts durable events before coalescing a deployment-specific wake at next hour plus five seconds", async () => {
  const calls: { topic: string; payload: unknown; options: unknown }[] = [];
  const publish = async (topic: string, payload: unknown, options: unknown) => {
    calls.push({ topic, payload, options });
    return { messageId: topic === METRIC_EVENT_TOPIC ? "msg-event" : "msg-wake" };
  };
  const queue = createMetricQueue({
    deploymentId: "dpl-test", now: () => Date.parse("2026-10-19T01:59:59.500Z"),
    publishEvent: publish, publishWake: publish,
  });
  assert.deepEqual(await queue.enqueueToolMetric(event()), { accepted: true, messageId: "msg-event", wakeScheduled: true });
  assert.equal(calls[0].topic, METRIC_EVENT_TOPIC);
  assert.deepEqual(calls[0].options, { idempotencyKey: "event-1", retentionSeconds: METRIC_RETENTION_SECONDS });
  assert.equal(calls[1].topic, METRIC_FLUSH_TOPIC);
  assert.deepEqual(calls[1].options, {
    idempotencyKey: `flush-dpl-test-${Date.parse("2026-10-19T02:00:00.000Z")}`,
    delaySeconds: 6, retentionSeconds: METRIC_RETENTION_SECONDS,
  });
});

test("official SDK JSON wire payloads match the raw NDJSON consumer and preserve deployment routing", async () => {
  // Explicit fake tokens and a complete fetch replacement ensure this exercises
  // the installed SDK without reading account credentials or making a request.
  const originalFetch = globalThis.fetch;
  const published: { url: string; headers: Headers; body: string }[] = [];
  let hasMessage = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("Authorization"), "Bearer offline-token");
    if (!url.includes("/consumer/")) {
      const body = Buffer.from(init?.body as Uint8Array).toString("utf8");
      published.push({ url, headers, body });
      return Response.json({ messageId: `published-${published.length}` }, { status: 201 });
    }
    assert.equal(headers.has("Vqs-Deployment-Id"), false);
    if (init?.method === "DELETE") return new Response(null, { status: 204 });
    if (hasMessage) return new Response(null, { status: 204 });
    hasMessage = true;
    return new Response(JSON.stringify({
      messageId: "published-1", receiptHandle: "offline-receipt",
      contentType: published[0].headers.get("Content-Type"),
      body: Buffer.from(published[0].body).toString("base64"),
    }));
  };
  try {
    const eventClient = new PollingQueueClient({ region: "iad1", deploymentId: null, token: "offline-token" });
    const wakeClient = new QueueClient({ region: "iad1", deploymentId: "dpl-offline", token: "offline-token" });
    const queue = createMetricQueue({
      deploymentId: "dpl-offline", region: "iad1", getToken: async () => "offline-token",
      publishEvent: eventClient.send, publishWake: wakeClient.send,
    });
    assert.equal((await queue.enqueueToolMetric(event())).accepted, true);
    assert.equal(published[0].url, `https://iad1.vercel-queue.com/api/v3/topic/${METRIC_EVENT_TOPIC}`);
    assert.equal(published[0].headers.get("Content-Type"), "application/json");
    assert.equal(published[0].headers.has("Vqs-Deployment-Id"), false);
    assert.equal(published[1].headers.get("Vqs-Deployment-Id"), "dpl-offline");
    assert.equal(published[0].headers.get("Vqs-Retention-Seconds"), String(METRIC_RETENTION_SECONDS));
    assert.equal(published[0].headers.get("Vqs-Idempotency-Key"), event().id);
    assert.ok(Number(published[1].headers.get("Vqs-Delay-Seconds")) > 0);
    let persisted: ToolMetricEvent[] = [];
    const result = await queue.consumeMetricQueue(async (events) => { persisted = events; });
    assert.deepEqual(persisted, [event()]);
    assert.deepEqual(result, { received: 1, acknowledged: 1, hasMore: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("accepted events remain accepted when wake publishing fails, including deferred acceptance without a message ID", async () => {
  const queue = createMetricQueue({
    publishEvent: async () => ({ messageId: null }),
    publishWake: async () => { throw new Error("unavailable"); },
  });
  assert.deepEqual(await queue.enqueueToolMetric(event()), { accepted: true, messageId: null, wakeScheduled: false });
});

test("ambiguous event publishing failure never schedules a wake or exposes credential-bearing errors", async () => {
  let wakeCalls = 0;
  const queue = createMetricQueue({
    publishEvent: async () => { throw new Error("private-token"); },
    publishWake: async () => { wakeCalls++; return { messageId: "wake" }; },
  });
  await assert.rejects(queue.enqueueToolMetric(event()), (error: unknown) => {
    assert.ok(error instanceof MetricQueueEnqueueError);
    assert.equal(error.accepted, "unknown");
    assert.equal(error.eventId, event().id);
    assert.equal(String(error).includes("private-token"), false);
    return true;
  });
  assert.equal(wakeCalls, 0);
});

test("receiver gathers durable events across deployment boundaries and commits every batch before acknowledgment", async () => {
  const pending = Array.from({ length: 120 }, (_, i) => envelope(event(i + 1), i + 1));
  const persisted = new Set<string>();
  const batchSizes: number[] = [];
  const tokenCalls: string[] = [];
  const queue = createMetricQueue({
    region: "iad1", getToken: async () => { tokenCalls.push("token"); return "test-token"; },
    fetch: async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      assert.equal(headers.has("Vqs-Deployment-Id"), false);
      assert.equal(headers.get("Authorization"), "Bearer test-token");
      assert.equal(init?.cache, "no-store");
      assert.ok(url.includes(`/topic/${METRIC_EVENT_TOPIC}/consumer/${METRIC_CONSUMER_GROUP}`));
      if (init?.method === "DELETE") {
        const receipt = decodeURIComponent(url.split("/lease/")[1]);
        const index = Number(receipt.slice("receipt/".length, -1));
        assert.equal(persisted.has(`event-${index}`), true, "acknowledgment precedes database commit");
        return new Response(null, { status: 204 });
      }
      assert.equal(Number(headers.get("Vqs-Max-Messages")) <= 10, true);
      assert.equal(headers.get("Vqs-Visibility-Timeout-Seconds"), "300");
      const items = pending.splice(0, Number(headers.get("Vqs-Max-Messages")));
      return items.length ? new Response(items.join("\n")) : new Response(null, { status: 204 });
    },
  });
  const result = await queue.consumeMetricQueue(async (events) => {
    batchSizes.push(events.length);
    for (const item of events) persisted.add(item.id);
  });
  assert.deepEqual(result, { received: 120, acknowledged: 120, hasMore: false });
  assert.deepEqual(batchSizes, [100, 20]);
  assert.equal(persisted.size, 120);
  assert.equal(tokenCalls.length, 133);
});

test("database failure leaves every received event unacknowledged for idempotent replay", async () => {
  let receives = 0;
  let acknowledgments = 0;
  const queue = createMetricQueue({
    getToken: async () => "test-token",
    fetch: async (_input, init) => {
      if (init?.method === "DELETE") { acknowledgments++; return new Response(null, { status: 204 }); }
      return receives++ === 0 ? new Response(envelope(event())) : new Response(null, { status: 204 });
    },
  });
  await assert.rejects(queue.consumeMetricQueue(async () => { throw new Error("database unavailable"); }), MetricQueueConsumeError);
  assert.equal(acknowledgments, 0);
});

test("partial acknowledgment failure reports progress without dropping the failed receipt", async () => {
  let receives = 0;
  let persisted = false;
  const queue = createMetricQueue({
    getToken: async () => "test-token",
    fetch: async (input, init) => {
      if (init?.method === "DELETE") {
        assert.equal(persisted, true);
        return new Response(null, { status: String(input).includes("receipt%2F2%3D") ? 503 : 204 });
      }
      return receives++ === 0
        ? new Response([envelope(event(1), 1), envelope(event(2), 2)].join("\n"))
        : new Response(null, { status: 204 });
    },
  });
  await assert.rejects(queue.consumeMetricQueue(async () => { persisted = true; }), (error: unknown) => {
    assert.ok(error instanceof MetricQueueConsumeError);
    assert.deepEqual(error.progress, { received: 2, acknowledged: 1, hasMore: true });
    return true;
  });
});

test("invalid accepted queue data stops processing and is never silently acknowledged", async () => {
  let persisted = false;
  let acknowledged = false;
  const queue = createMetricQueue({
    getToken: async () => "test-token",
    fetch: async (_input, init) => {
      if (init?.method === "DELETE") acknowledged = true;
      return new Response(envelope({ ...event(), metric: "other" }));
    },
  });
  await assert.rejects(queue.consumeMetricQueue(async () => { persisted = true; }), /invalid event data/);
  assert.equal(persisted, false);
  assert.equal(acknowledged, false);
});

test("event and time budgets request continuation while committing all events already leased", async () => {
  for (const { maxDurationMs, maxEvents, expected } of [
    { maxDurationMs: 75, maxEvents: 100, expected: 20 },
    { maxDurationMs: 200_000, maxEvents: 15, expected: 15 },
  ]) {
    let currentTime = 0;
    let persisted = 0;
    let nextIndex = 1;
    const queue = createMetricQueue({
      maxEvents, maxDurationMs, now: () => currentTime, getToken: async () => "test-token",
      fetch: async (_input, init) => {
        if (init?.method === "DELETE") return new Response(null, { status: 204 });
        currentTime += 50;
        const limit = Number(new Headers(init?.headers).get("Vqs-Max-Messages"));
        return new Response(Array.from({ length: limit }, () => envelope(event(nextIndex), nextIndex++)).join("\n"));
      },
    });
    const result = await queue.consumeMetricQueue(async (events) => { persisted += events.length; });
    assert.deepEqual(result, { received: expected, acknowledged: expected, hasMore: true });
    assert.equal(persisted, expected);
  }
});

test("continuation wakes can bypass hourly coalescing with an explicit immediate key", async () => {
  let sendOptions: unknown;
  const queue = createMetricQueue({ publishWake: async (_topic, _payload, options) => {
    sendOptions = options;
    return { messageId: "wake" };
  } });
  await queue.scheduleMetricFlush({ delaySeconds: 0, idempotencyKey: "continue-unique-id" });
  assert.deepEqual(sendOptions, { delaySeconds: 0, idempotencyKey: "continue-unique-id", retentionSeconds: METRIC_RETENTION_SECONDS });
});
