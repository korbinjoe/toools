import { test } from "node:test";
import assert from "node:assert/strict";
import { createRevalidationHandler, expireCatalog } from "../../src/app/api/revalidate/handler";
import { CatalogPublication, publicationConfiguration, refreshCatalog, refreshConfiguration, runWithPublication } from "./catalog-publication";

const secret = "a-random-test-only-secret-with-32-characters";
function request(body = '{"catalog":true}', token = secret, type = "application/json") {
  return new Request("https://example.com/api/revalidate", {
    method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": type }, body,
  });
}

test("revalidation fails closed when secret is missing or short", async () => {
  for (const missing of [undefined, "short"]) {
    let called = false;
    const response = await createRevalidationHandler(() => { called = true; }, () => missing)(request());
    assert.equal(response.status, 503);
    assert.equal(called, false);
  }
});

test("revalidation rejects invalid bearer tokens without performing invalidation", async () => {
  let called = false;
  const handler = createRevalidationHandler(() => { called = true; }, () => secret);
  for (const token of ["", "short", secret + "x", "x".repeat(secret.length)]) {
    assert.equal((await handler(request('{"catalog":true}', token))).status, 401);
  }
  assert.equal(called, false);
});

test("revalidation accepts only the bounded catalog payload", async () => {
  let calls = 0;
  const handler = createRevalidationHandler(() => { calls++; }, () => secret);
  for (const body of ["null", "[]", "{}", "invalid-json", '{"catalog":false}', '{"catalog":true,"path":"/admin"}', '{"tag":"toools:catalog"}', `{"catalog":true,"extra":"${"x".repeat(1100)}"}`]) {
    assert.equal((await handler(request(body))).status, 400);
  }
  assert.equal((await handler(request('{"catalog":true}', secret, "text/plain"))).status, 415);
  assert.equal(calls, 0);
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { revalidated: true, catalog: true });
  assert.equal(calls, 1);
});

test("publication expires shared data immediately and invalidates the entire layout including old 404s", () => {
  const calls: unknown[] = [];
  expireCatalog("toools:catalog", (tag, profile) => { calls.push([tag, profile]); }, (path, type) => { calls.push([path, type]); });
  assert.deepEqual(calls, [["toools:catalog", { expire: 0 }], ["/", "layout"]]);
});

test("refresh configuration rejects unsafe URLs and permits exact HTTPS or loopback endpoints", () => {
  const env = { REVALIDATION_SECRET: secret };
  for (const url of ["https://example.com/other", "http://example.com/api/revalidate", "https://a:b@example.com/api/revalidate", "https://example.com/api/revalidate?secret=x", "https://example.com/api/revalidate#x"]) {
    assert.throws(() => refreshConfiguration({ ...env, CACHE_REVALIDATION_URL: url }));
  }
  for (const url of ["https://example.com/api/revalidate", "http://127.0.0.1:3000/api/revalidate", "http://[::1]:3000/api/revalidate"]) {
    assert.equal(refreshConfiguration({ ...env, CACHE_REVALIDATION_URL: url }).url, url);
  }
});

test("operator refresh uses header authentication, refuses redirects, and fails for non-acknowledged responses", async () => {
  const config = { url: "https://example.com/api/revalidate", secret };
  let calls = 0;
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(url, config.url);
    assert.equal(init?.redirect, "error");
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${secret}`);
    assert.equal(init?.body, '{"catalog":true}');
    assert.equal(init?.method, "POST");
    calls++;
    return Response.json({ revalidated: true });
  };
  await refreshCatalog(config, fetcher);
  assert.equal(calls, 1);
  for (const response of [Response.json({ revalidated: true }, { status: 401 }), Response.json({}), new Response("bad gateway", { status: 502 })]) {
    await assert.rejects(refreshCatalog(config, async () => response), /Database changes are committed/);
  }
  await assert.rejects(refreshCatalog(config, async () => { throw new Error(secret); }), /without replaying the write/);
});

test("pending-only or dry-run operation does not attempt a cache refresh", async () => {
  // No environment configuration is needed until a real public write succeeds.
  await new CatalogPublication().refresh();
});

test("loopback seed works without cache credentials, while remote or partial configuration fails before writing", async () => {
  let writes = 0;
  let refreshes = 0;
  const messages: string[] = [];
  const local = new CatalogPublication({
    environment: () => ({ DATABASE_URL: "postgresql://user@127.0.0.1:5432/toools_test" }),
    refresh: async () => { refreshes++; }, info: (message) => messages.push(message),
  });
  local.prepare();
  writes++;
  local.markChanged();
  await local.refresh();
  assert.equal(writes, 1);
  assert.equal(refreshes, 0);
  assert.match(messages[0], /Local database changed; remote cache refresh skipped/);
  for (const env of [
    { DATABASE_URL: "postgresql://remote.example/toools" },
    { DATABASE_URL: "postgresql://localhost/toools", REVALIDATION_SECRET: secret },
    { DATABASE_URL: "postgresql://localhost/toools", CACHE_REVALIDATION_URL: "http://localhost:3000/api/revalidate" },
  ]) {
    const publication = new CatalogPublication({ environment: () => env });
    assert.throws(() => { publication.prepare(); writes++; }, /REVALIDATION_SECRET|CACHE_REVALIDATION_URL/);
  }
  assert.equal(writes, 1);
  assert.equal(publicationConfiguration({ DATABASE_URL: "postgresql://user@[::1]:5432/toools" }), null);
});

test("many committed writes refresh once, and cache failure retains the batch for a refresh-only retry", async () => {
  let attempts = 0;
  const config = { REVALIDATION_SECRET: secret, CACHE_REVALIDATION_URL: "https://example.com/api/revalidate" };
  const publication = new CatalogPublication({
    environment: () => config,
    refresh: async () => { if (++attempts === 1) throw new Error("endpoint unavailable"); },
  });
  publication.prepare();
  for (let i = 0; i < 100; i++) publication.markChanged();
  await assert.rejects(publication.refresh(), /Database changes were saved/);
  assert.equal(attempts, 1);
  await publication.refresh();
  assert.equal(attempts, 2);
  await publication.refresh();
  assert.equal(attempts, 2);
});

test("finally refreshes an earlier committed change even when a later write fails", async () => {
  let refreshes = 0;
  const publication = new CatalogPublication({
    environment: () => ({ REVALIDATION_SECRET: secret, CACHE_REVALIDATION_URL: "https://example.com/api/revalidate" }),
    refresh: async () => { refreshes++; },
  });
  await assert.rejects((async () => {
    try {
      publication.prepare();
      publication.markChanged();
      throw new Error("second write failed");
    } finally { await publication.refresh(); }
  })(), /second write failed/);
  assert.equal(refreshes, 1);
});

test("operation and refresh failures are both reported, and the database is still disconnected", async () => {
  const steps: string[] = [];
  const publication = new CatalogPublication({
    environment: () => ({ REVALIDATION_SECRET: secret, CACHE_REVALIDATION_URL: "https://example.com/api/revalidate" }),
    refresh: async () => { steps.push("refresh"); throw new Error("refresh unavailable"); },
  });
  await assert.rejects(runWithPublication(async () => {
    publication.prepare();
    publication.markChanged();
    steps.push("committed first write");
    throw new Error("later transaction failed");
  }, () => publication, async () => { steps.push("disconnect"); }), (error: unknown) => {
    assert(error instanceof AggregateError);
    assert.match(error.message, /later transaction failed/);
    assert.match(error.message, /refresh unavailable/);
    return true;
  });
  assert.deepEqual(steps, ["committed first write", "refresh", "disconnect"]);
});
