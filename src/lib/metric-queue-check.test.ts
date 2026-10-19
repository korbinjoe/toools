import assert from "node:assert/strict";
import test from "node:test";
import { PollingQueueClient } from "@vercel/queue";
import { createMetricQueue, METRIC_CONSUMER_GROUP, METRIC_EVENT_TOPIC, METRIC_FLUSH_TOPIC } from "./metric-queue";
import { createMetricQueueCheck, METRIC_CHECK_CONSUMER, METRIC_CHECK_TOPIC } from "./metric-queue-check";
import { createMetricsCheckHandler } from "../app/api/metrics/check/handler";
import type { ToolMetricEvent } from "./metric-event";

const secret = "offline-cron-secret-with-at-least-32-characters";
const request = (authorization = `Bearer ${secret}`, suffix = "", body?: string) => new Request(`https://toools.top/api/metrics/check${suffix}`, {
  method: "POST", headers: { authorization }, body,
});
const envelope = (event: ToolMetricEvent) => JSON.stringify({
  messageId: "offline-check", receiptHandle: "offline-receipt",
  body: Buffer.from(JSON.stringify(event)).toString("base64"),
});

test("queue diagnostics requires CRON_SECRET and refuses caller-selected input before any work", async () => {
  let calls = 0;
  const check = async () => { calls++; return { checked: true }; };
  for (const invalid of [undefined, "short"]) assert.equal((await createMetricsCheckHandler(check, () => invalid)(request())).status, 503);
  const handler = createMetricsCheckHandler(check, () => secret);
  for (const authorization of ["", "Bearer wrong", `Bearer ${secret}more`, `Basic ${secret}`]) {
    assert.equal((await handler(request(authorization))).status, 401);
  }
  assert.equal((await handler(request(undefined, "?topic=toools-metric-events-v1"))).status, 400);
  assert.equal((await handler(request(undefined, "", '{"toolId":"real-tool"}'))).status, 400);
  assert.equal(calls, 0);
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { checked: true });
  assert.equal(calls, 1);
  const streamedEmpty = request(undefined, "", "");
  assert.notEqual(streamedEmpty.body, null);
  assert.equal((await handler(streamedEmpty)).status, 200);
  assert.equal(calls, 2);
});

test("diagnostic provider failures cannot expose OIDC or database secrets", async () => {
  const handler = createMetricsCheckHandler(async () => { throw new Error("private-token postgresql://private"); }, () => secret);
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private"), false);
});

test("isolated canary exercises official publishing, OIDC polling and acknowledgment without a production topic or wake", async () => {
  const originalFetch = globalThis.fetch;
  let publishedEvent: ToolMetricEvent | undefined;
  let received = false;
  let acknowledged = false;
  let tokens = 0;
  const seen: string[] = [];
  const transport: typeof fetch = async (input, init) => {
    const url = String(input);
    seen.push(url);
    assert.equal(url.includes(METRIC_EVENT_TOPIC), false);
    assert.equal(url.includes(METRIC_CONSUMER_GROUP), false);
    assert.equal(url.includes(METRIC_FLUSH_TOPIC), false);
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer offline-oidc");
    if (!url.includes("/consumer/")) {
      assert.equal(url, `https://iad1.vercel-queue.com/api/v3/topic/${METRIC_CHECK_TOPIC}`);
      publishedEvent = JSON.parse(Buffer.from(init?.body as Uint8Array).toString("utf8")) as ToolMetricEvent;
      return Response.json({ messageId: "offline-check" }, { status: 201 });
    }
    assert.ok(url.includes(`/topic/${METRIC_CHECK_TOPIC}/consumer/${METRIC_CHECK_CONSUMER}`));
    if (init?.method === "DELETE") {
      acknowledged = true;
      return new Response(null, { status: 204 });
    }
    if (received) return new Response(null, { status: 204 });
    received = true;
    assert.ok(publishedEvent);
    return new Response(envelope(publishedEvent));
  };
  globalThis.fetch = transport;
  try {
    const sdk = new PollingQueueClient({ region: "iad1", deploymentId: null, token: "offline-oidc" });
    const check = createMetricQueueCheck({
      randomId: () => "test-nonce", now: () => Date.parse("2026-11-01T00:10:00Z"), sleep: async () => {},
      queueOptions: {
        region: "iad1", publishEvent: sdk.send, fetch: transport,
        getToken: async () => { tokens++; return "offline-oidc"; },
        publishWake: async () => { throw new Error("must never schedule a statistics wake"); },
      },
    });
    assert.deepEqual(await check(), { checked: true, isolated: true, producer: true, poll: true, acknowledged: true });
    assert.equal(publishedEvent?.id, "metric-check-test-nonce");
    assert.equal(publishedEvent?.toolId, "toools-metric-validation-only");
    assert.equal(acknowledged, true);
    assert.equal(tokens, 3);
    assert.equal(seen.length, 4);
  } finally { globalThis.fetch = originalFetch; }
});

test("canary waits for eventual visibility and never reports another diagnostic event as its own", async () => {
  let event: ToolMetricEvent | undefined;
  let polls = 0;
  let acked = 0;
  let sleeps = 0;
  const check = createMetricQueueCheck({
    randomId: () => "current", now: () => Date.parse("2026-11-01T00:10:00Z"), sleep: async () => { sleeps++; },
    queueOptions: {
      publishEvent: async (_topic, payload) => { event = payload as ToolMetricEvent; return { messageId: null }; },
      getToken: async () => "offline",
      fetch: async (_input, init) => {
        if (init?.method === "DELETE") { acked++; return new Response(null, { status: 204 }); }
        polls++;
        if (polls === 1) return new Response(null, { status: 204 });
        if (polls === 2) return new Response(envelope({ ...event!, id: "metric-check-older" }));
        if (polls === 4) return new Response(envelope(event!));
        return new Response(null, { status: 204 });
      },
    },
  });
  assert.equal((await check()).checked, true);
  assert.equal(acked, 2);
  assert.equal(sleeps, 2);
});

test("canary rejects an unexpected event without acknowledging it, and requires its acknowledgment", async () => {
  for (const failure of ["foreign", "ack"] as const) {
    let event: ToolMetricEvent | undefined;
    let polls = 0;
    let acknowledgments = 0;
    const check = createMetricQueueCheck({
      randomId: () => "current", sleep: async () => {},
      queueOptions: {
        publishEvent: async (_topic, payload) => { event = payload as ToolMetricEvent; return { messageId: "offline" }; },
        getToken: async () => "offline",
        fetch: async (_input, init) => {
          if (init?.method === "DELETE") { acknowledgments++; return new Response(null, { status: 503 }); }
          if (polls++) return new Response(null, { status: 204 });
          return new Response(envelope(failure === "foreign" ? { ...event!, toolId: "real-tool" } : event!));
        },
      },
    });
    await assert.rejects(check());
    assert.equal(acknowledgments, failure === "foreign" ? 0 : 1);
  }
});

test("canary with no observed delivery has a bounded retry count and fails closed", async () => {
  let polls = 0;
  let sleeps = 0;
  const check = createMetricQueueCheck({
    now: () => Date.parse("2026-11-01T00:10:00Z"), sleep: async () => { sleeps++; },
    queueOptions: {
      publishEvent: async () => ({ messageId: null }), getToken: async () => "offline",
      fetch: async () => { polls++; return new Response(null, { status: 204 }); },
    },
  });
  await assert.rejects(check(), /did not observe/);
  assert.equal(polls, 20);
  assert.equal(sleeps, 19);
});

test("queue namespace configuration cannot inject paths and production defaults remain unchanged", async () => {
  for (const unsafe of ["", "../production", "topic/other", "topic?x=1", "bad\nheader"]) {
    assert.throws(() => createMetricQueue({ eventTopic: unsafe }), /namespace/);
    assert.throws(() => createMetricQueue({ consumerGroup: unsafe }), /namespace/);
  }
  const topics: string[] = [];
  const queue = createMetricQueue({ publishEvent: async (topic) => { topics.push(topic); return { messageId: "default" }; } });
  await queue.publishToolMetricEvent({ id: "test", toolId: "test", metric: "view", occurredAt: new Date().toISOString() });
  assert.deepEqual(topics, [METRIC_EVENT_TOPIC]);
});
