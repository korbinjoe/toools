import assert from "node:assert/strict";
import test from "node:test";
import { createToolMetricFlusher } from "./flush-tool-metrics";
import type { ToolMetricEvent } from "./metric-event";

const event: ToolMetricEvent = {
  id: "event-1", toolId: "tool-1", metric: "view", occurredAt: "2026-10-19T00:00:00.000Z",
};

test("disabled metrics never poll, initialize persistence, invalidate, prune or schedule", async () => {
  const unexpected = async () => { throw new Error("Disabled metrics did work"); };
  const flush = createToolMetricFlusher({
    isEnabled: () => false, consume: unexpected, persist: unexpected,
    prune: unexpected, schedule: unexpected, invalidate: () => { throw new Error("Invalidated"); },
  });
  assert.deepEqual(await flush({ pruneReceipts: true }), {
    enabled: false, received: 0, acknowledged: 0, applied: 0, toolsUpdated: 0, hasMore: false,
  });
});

test("an empty queue never wakes the database for writes or receipt pruning", async () => {
  const unexpected = async () => { throw new Error("Empty queue touched storage"); };
  const flush = createToolMetricFlusher({
    isEnabled: () => true,
    consume: async () => ({ received: 0, acknowledged: 0, hasMore: false }),
    persist: unexpected, prune: unexpected, schedule: unexpected,
    invalidate: () => { throw new Error("Empty queue invalidated cache"); },
  });
  assert.equal((await flush({ pruneReceipts: true })).received, 0);
});

test("committed counters expire metric caches even when later acknowledgments fail", async () => {
  let invalidations = 0;
  const flush = createToolMetricFlusher({
    isEnabled: () => true,
    consume: async (persist) => {
      await persist([event]);
      throw new Error("acknowledgment failed");
    },
    persist: async () => ({ received: 1, applied: 1, toolsUpdated: 1 }),
    invalidate: () => { invalidations++; },
  });
  await assert.rejects(flush(), /acknowledgment failed/);
  assert.equal(invalidations, 1);
});

test("replayed committed events do not invalidate warm cache entries again", async () => {
  const flush = createToolMetricFlusher({
    isEnabled: () => true,
    consume: async (persist) => { await persist([event]); return { received: 1, acknowledged: 1, hasMore: false }; },
    persist: async () => ({ received: 1, applied: 0, toolsUpdated: 0 }),
    invalidate: () => { throw new Error("Replayed event invalidated cache"); },
  });
  assert.equal((await flush()).applied, 0);
});

test("a budget-limited worker schedules an immediate unique continuation and daily cleanup runs only after real work", async () => {
  let pruned = false;
  let invalidated = false;
  let continued = false;
  const flush = createToolMetricFlusher({
    isEnabled: () => true,
    consume: async (persist) => { await persist([event]); return { received: 1, acknowledged: 1, hasMore: true }; },
    persist: async () => ({ received: 1, applied: 1, toolsUpdated: 1 }),
    schedule: async (options) => {
      assert.equal(options?.delaySeconds, 0);
      assert.match(options?.idempotencyKey ?? "", /^continue-/);
      continued = true;
    },
    prune: async () => { pruned = true; },
    invalidate: () => { invalidated = true; },
  });
  const result = await flush({ pruneReceipts: true });
  assert.equal(result.applied, 1);
  assert.equal(pruned && invalidated && continued, true);
});
