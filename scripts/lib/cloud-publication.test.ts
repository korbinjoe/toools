import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  completeIssue9, ISSUE_9, ISSUE_9_VERIFICATION_SQL, issue9CompletionBody,
  verifyIssue9Database, verifyIssue9Online, waitForVercelDeployment,
} from "./cloud-publication";

const sha = "a".repeat(40);
const readyDeployment = {
  id: "dpl_test123", projectId: "project", target: "production",
  meta: { githubCommitSha: sha }, readyState: "READY", aliasAssigned: true,
  alias: ["toools.top"], env: ["must-not-be-returned"],
};
const deploymentOptions = {
  token: "test-vercel-token", teamId: "team", projectId: "project",
  deploymentId: readyDeployment.id, expectedSha: sha, intervalMs: 0, maxAttempts: 3,
};

test("production deployment polling checks commit, project, production alias, and returns no private response fields", async () => {
  let polls = 0;
  let sleeps = 0;
  const result = await waitForVercelDeployment({
    ...deploymentOptions,
    fetcher: async (input, init) => {
      const url = new URL(String(input));
      assert.equal(url.origin, "https://api.vercel.com");
      assert.equal(url.searchParams.get("teamId"), "team");
      assert.equal(init?.redirect, "error");
      assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-vercel-token");
      if (url.pathname.startsWith("/v4/aliases/")) {
        assert.equal(url.pathname, "/v4/aliases/toools.top");
        assert.equal(url.searchParams.get("projectId"), "project");
        return Response.json({ alias: "toools.top", projectId: "project", deploymentId: readyDeployment.id });
      }
      assert.equal(url.pathname, "/v13/deployments/dpl_test123");
      return Response.json(++polls === 1 ? { ...readyDeployment, readyState: "BUILDING", aliasAssigned: false } : readyDeployment);
    },
    sleep: async () => { sleeps++; },
  });
  assert.deepEqual(result, { deploymentId: readyDeployment.id, sha });
  assert.equal(polls, 2);
  assert.equal(sleeps, 1);
});

test("historical deployment aliases cannot substitute for the current production domain assignment", async () => {
  for (const alias of [
    { alias: "toools.top", projectId: "project", deploymentId: "dpl_newer" },
    { alias: "toools.top", projectId: "different-project", deploymentId: readyDeployment.id },
    { alias: "other.example", projectId: "project", deploymentId: readyDeployment.id },
    { alias: "toools.top", projectId: "project" },
  ]) {
    let lookups = 0;
    await assert.rejects(waitForVercelDeployment({
      ...deploymentOptions,
      fetcher: async (input, init) => {
        assert.equal(init?.redirect, "error");
        if (new URL(String(input)).pathname.startsWith("/v4/aliases/")) { lookups++; return Response.json(alias); }
        return Response.json(readyDeployment);
      },
    }), /domain no longer points/);
    assert.equal(lookups, 1);
  }
});

test("deployment polling fails closed for wrong code, project, preview, provider errors, and timeout", async () => {
  for (const deployment of [
    { ...readyDeployment, projectId: "other" },
    { ...readyDeployment, id: "dpl_other" },
    { ...readyDeployment, target: "preview" },
    { ...readyDeployment, meta: {} },
    { ...readyDeployment, gitSource: { sha: "b".repeat(40) } },
    { ...readyDeployment, readyState: "ERROR" },
    { ...readyDeployment, readyState: "CANCELED" },
    { ...readyDeployment, aliasError: { message: "internal error must not leak" } },
  ]) {
    await assert.rejects(waitForVercelDeployment({ ...deploymentOptions, fetcher: async () => Response.json(deployment) }));
  }
  await assert.rejects(waitForVercelDeployment({ ...deploymentOptions, maxAttempts: 2, fetcher: async () => Response.json({ ...readyDeployment, alias: ["other.example"] }) }), /polling budget/);
  await assert.rejects(waitForVercelDeployment({ ...deploymentOptions, fetcher: async () => new Response("sensitive error", { status: 401 }) }), /HTTP 401/);
  await assert.rejects(waitForVercelDeployment({ ...deploymentOptions, fetcher: async () => { throw new Error("test-vercel-token"); } }), (error: Error) => !error.message.includes("test-vercel-token"));
});

type LiveOverride = { body?: string; status?: number; contentType?: string };
function liveFetcher(overrides: Record<string, LiveOverride> = {}): typeof fetch {
  const html = {
    "/": '<h1>Find the right tools</h1><a href="/tools">Browse tools</a>',
    "/tools/mangatranslate": '<h1 class="title">MangaTranslate</h1><p>Image &amp; Media</p><a href="/api/tools/mangatranslate/out">Website</a><script type="application/ld+json">{"@type":"SoftwareApplication","name":"MangaTranslate","url":"https://www.mangatranslate.com/","applicationCategory":"Image & Media"}</script>',
    "/categories/image-media": '<h1>Image &amp; Media</h1><a href="/tools/mangatranslate">MangaTranslate</a>',
    "/tools?q=MangaTranslate": '<h1>Browse Tools</h1><a href="/tools/mangatranslate">MangaTranslate</a>',
    "/sitemap.xml": '<urlset><url><loc>https://toools.top/tools/mangatranslate</loc></url></urlset>',
  };
  return async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, ISSUE_9.origin);
    assert.equal(init?.redirect, "error");
    assert.equal(init?.cache, "no-store");
    const path = url.pathname + url.search;
    const override = overrides[path];
    return new Response(override?.body ?? html[path as keyof typeof html], {
      status: override?.status ?? 200,
      headers: { "content-type": override?.contentType ?? (path.endsWith(".xml") ? "application/xml" : "text/html") },
    });
  };
}

test("live publication verification requires real detail, category/search links, homepage, and sitemap", async () => {
  assert.deepEqual(await verifyIssue9Online({ fetcher: liveFetcher() }), {
    origin: ISSUE_9.origin, listingUrl: "https://toools.top/tools/mangatranslate",
    checkedPaths: ["/", "/tools/mangatranslate", "/categories/image-media", "/tools?q=MangaTranslate", "/sitemap.xml"],
  });
});

test("live checks reject 404s, error documents, serialized-only links, external links, and stale sitemaps", async () => {
  const cases: Record<string, LiveOverride>[] = [
    { "/tools/mangatranslate": { status: 404 } },
    { "/tools/mangatranslate": { body: '<script>{"name":"MangaTranslate"}</script><h1>Application error</h1>' } },
    { "/tools/mangatranslate": { contentType: "application/json" } },
    { "/categories/image-media": { body: '<script>const link = \'<a href="/tools/mangatranslate">MangaTranslate</a>\'</script>' } },
    { "/tools?q=MangaTranslate": { body: '<a href="https://other.example/tools/mangatranslate">MangaTranslate</a>' } },
    { "/sitemap.xml": { body: '<urlset><url><loc>https://toools.top/tools/other</loc></url></urlset>' } },
  ];
  for (const overrides of cases) await assert.rejects(verifyIssue9Online({ fetcher: liveFetcher(overrides) }));
  await assert.rejects(verifyIssue9Online({ origin: "https://user:password@toools.top" }), /bare HTTPS/);
});

test("reviewed publication SQL can be repeated without resetting counts and database verification checks provenance", async () => {
  const postgres = new PGlite();
  try {
    const migrations = (await fs.readdir("prisma/migrations", { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    for (const migration of migrations) await postgres.exec(await fs.readFile(`prisma/migrations/${migration}/migration.sql`, "utf8"));
    await postgres.exec(`
      INSERT INTO "Category" (id,name,slug) VALUES ('image','Image & Media','image-media');
      INSERT INTO "Tag" (id,name,slug) VALUES ('ai','AI','ai'),('image-editing','Image Editing','image-editing');
    `);
    const publication = await fs.readFile("scripts/approve-issue-9.sql", "utf8");
    await postgres.exec(publication);
    const query = async (text: string, values: unknown[]) => postgres.query<Record<string, unknown>>(text, values);
    const first = await verifyIssue9Database(query);
    await postgres.query('UPDATE "Tool" SET "viewCount" = 17, "clickCount" = 3 WHERE id = $1', [first.toolId]);
    await postgres.exec(publication);
    assert.deepEqual(await verifyIssue9Database(query), first);
    assert.deepEqual((await postgres.query('SELECT "viewCount", "clickCount" FROM "Tool" WHERE id = $1', [first.toolId])).rows, [{ viewCount: 17, clickCount: 3 }]);
    assert.equal((await postgres.query('SELECT id FROM "ToolDiscovery" WHERE "toolId" = $1', [first.toolId])).rows.length, 1);
    await postgres.exec('DELETE FROM "ToolDiscovery"');
    await assert.rejects(verifyIssue9Database(query), /leave the issue open/);
  } finally { await postgres.close(); }
});

test("database verification is parameterized and rejects incomplete moderation or identity", async () => {
  const row = {
    id: "tool", name: "MangaTranslate", slug: "mangatranslate", status: "APPROVED", pricing: "FREEMIUM",
    url: "https://www.mangatranslate.com/", categorySlug: "image-media", platforms: ["Web"],
    tags: ["ai", "image-editing"], hasIdentity: true, hasIssueProvenance: true,
  };
  assert.deepEqual(await verifyIssue9Database(async (text, values) => {
    assert.equal(text, ISSUE_9_VERIFICATION_SQL);
    assert.deepEqual(values, ["mangatranslate", "url:mangatranslate.com", "korbinjoe/toools#9", ISSUE_9.sourceUrl]);
    return { rows: [row] };
  }), { toolId: "tool", slug: "mangatranslate" });
  for (const invalid of [{ ...row, status: "PENDING" }, { ...row, hasIdentity: false }, { ...row, hasIssueProvenance: false }, { ...row, tags: ["ai"] }, { ...row, categorySlug: "other" }]) {
    await assert.rejects(verifyIssue9Database(async () => ({ rows: [invalid] })));
  }
});

function githubTransport(options: { existingComment?: boolean; closed?: boolean; failCloseOnce?: boolean; failPostAfterCommitOnce?: boolean; spoofedComment?: boolean } = {}) {
  const comments = options.existingComment ? [{ id: 1, html_url: "https://github.com/comment/1", body: issue9CompletionBody(), user: { login: "github-actions[bot]" } }] : [];
  if (options.spoofedComment) comments.push({ id: 100, html_url: "https://github.com/comment/100", body: issue9CompletionBody(), user: { login: "untrusted-contributor" } });
  let closed = options.closed ?? false;
  let postCalls = 0;
  let patchCalls = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.github.com");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-gh-token");
    assert.equal(init?.redirect, "error");
    if (url.pathname.endsWith("/comments")) {
      if (init?.method === "POST") {
        postCalls++;
        assert.equal(JSON.parse(String(init.body)).body, issue9CompletionBody());
        const comment = { id: comments.length + 1, html_url: `https://github.com/comment/${comments.length + 1}`, body: issue9CompletionBody(), user: { login: "github-actions[bot]" } };
        comments.push(comment);
        if (options.failPostAfterCommitOnce && postCalls === 1) throw new Error("connection lost after commit");
        return Response.json(comment, { status: 201 });
      }
      return Response.json(comments);
    }
    assert.equal(url.pathname, "/repos/korbinjoe/toools/issues/9");
    if (init?.method === "PATCH") {
      patchCalls++;
      assert.deepEqual(JSON.parse(String(init.body)), { state: "closed", state_reason: "completed" });
      if (options.failCloseOnce && patchCalls === 1) return Response.json({ error: "temporary" }, { status: 503 });
      closed = true;
    }
    return Response.json({ number: 9, state: closed ? "closed" : "open", state_reason: closed ? "completed" : null });
  };
  return { fetcher, stats: () => ({ postCalls, patchCalls, closed }) };
}

test("issue completion posts once, closes as completed, and is idempotent on rerun", async () => {
  const transport = githubTransport();
  const options = { token: "test-gh-token", fetcher: transport.fetcher };
  assert.equal((await completeIssue9(options)).commentCreated, true);
  assert.equal((await completeIssue9(options)).commentCreated, false);
  assert.deepEqual(transport.stats(), { postCalls: 1, patchCalls: 1, closed: true });
});

test("an existing completion resumes close after failure without duplicate comments", async () => {
  const transport = githubTransport({ failCloseOnce: true });
  const options = { token: "test-gh-token", fetcher: transport.fetcher };
  await assert.rejects(completeIssue9(options), /HTTP 503/);
  assert.deepEqual(transport.stats(), { postCalls: 1, patchCalls: 1, closed: false });
  await completeIssue9(options);
  assert.deepEqual(transport.stats(), { postCalls: 1, patchCalls: 2, closed: true });
});

test("an uncertain comment POST is never retried within a run and the next run discovers its marker", async () => {
  const transport = githubTransport({ failPostAfterCommitOnce: true });
  const options = { token: "test-gh-token", fetcher: transport.fetcher };
  await assert.rejects(completeIssue9(options), /completion comment request failed/);
  assert.deepEqual(transport.stats(), { postCalls: 1, patchCalls: 0, closed: false });
  await completeIssue9(options);
  assert.deepEqual(transport.stats(), { postCalls: 1, patchCalls: 1, closed: true });
});

test("a contributor cannot spoof the trusted completion marker", async () => {
  const transport = githubTransport({ spoofedComment: true });
  await completeIssue9({ token: "test-gh-token", fetcher: transport.fetcher });
  assert.equal(transport.stats().postCalls, 1);
});

test("completion searches later comment pages before posting", async () => {
  let pageCount = 0;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/comments")) {
      assert.notEqual(init?.method, "POST");
      if (++pageCount === 1) return Response.json(Array.from({ length: 100 }, (_, id) => ({ id, body: "unrelated", user: { login: "someone" } })));
      return Response.json([{ id: 101, body: issue9CompletionBody(), user: { login: "github-actions[bot]" }, html_url: "https://github.com/comment/101" }]);
    }
    return Response.json({ number: 9, state: "closed", state_reason: "completed" });
  };
  assert.equal((await completeIssue9({ token: "test-gh-token", fetcher })).commentCreated, false);
  assert.equal(pageCount, 2);
});
