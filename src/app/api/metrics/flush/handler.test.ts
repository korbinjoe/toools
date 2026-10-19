import assert from "node:assert/strict";
import test from "node:test";
import { createMetricsCronHandler } from "./handler";

const secret = "test-cron-secret-that-has-more-than-32-characters";

test("metric cron requires configured credentials and rejects missing or incorrect bearer tokens without work", async () => {
  let calls = 0;
  const flush = async () => { calls++; return { received: 0 }; };
  const unconfigured = createMetricsCronHandler(flush, () => undefined);
  assert.equal((await unconfigured(new Request("https://example.com/api/metrics/flush"))).status, 503);
  const handler = createMetricsCronHandler(flush, () => secret);
  for (const authorization of ["", "Bearer wrong", secret, `Basic ${secret}`, `Bearer ${secret}extra`]) {
    const response = await handler(new Request("https://example.com/api/metrics/flush", { headers: { authorization } }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(calls, 0);
});

test("authorized metric cron invokes one drain and never exposes credentials", async () => {
  let calls = 0;
  const handler = createMetricsCronHandler(async () => { calls++; return { received: 0, acknowledged: 0, hasMore: false }; }, () => secret);
  const response = await handler(new Request("https://example.com/api/metrics/flush", { headers: { authorization: `Bearer ${secret}` } }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: 0, acknowledged: 0, hasMore: false });
  assert.equal(calls, 1);
});

test("failed metric cron returns a retryable response without publishing its error body", async () => {
  const handler = createMetricsCronHandler(async () => { throw new Error("private connection details"); }, () => secret);
  const response = await handler(new Request("https://example.com/api/metrics/flush", { headers: { authorization: `Bearer ${secret}` } }));
  assert.equal(response.status, 500);
  assert.equal((await response.text()).includes("private connection details"), false);
});
