import assert from "node:assert/strict";
import test from "node:test";
import { pageMetadata, serializeJsonLd, siteUrl, toolsPageHref, toolsSearchPolicy } from "./seo";
import { buildSitemap } from "./seo-sitemap";
import { toolMetricQuery } from "./tool-metrics";
import { HTML_METADATA_BOTS } from "./crawlers";

test("AI search crawlers receive blocking metadata while the default limited crawlers remain covered", () => {
  for (const agent of ["OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "Claude-SearchBot", "Bingbot", "facebookexternalhit", "Twitterbot", "Google-InspectionTool"]) assert.ok(HTML_METADATA_BOTS.test(agent), agent);
  assert.equal(HTML_METADATA_BOTS.test("Mozilla/5.0 Chrome/130.0 Safari/537.36"), false);
});

test("normal pagination is indexable with its own canonical; tracking and UI parameters do not create duplicate canonicals", () => {
  assert.deepEqual(toolsSearchPolicy({ page: "2", focus: "search", utm_source: "chatgpt", gclid: "123" }).path, "/tools?page=2");
  assert.equal(toolsSearchPolicy({ page: "2" }).index, true);
  assert.equal(toolsSearchPolicy({ page: "1" }).path, "/tools");
  const metadata = pageMetadata("Browse Tools", "Description", toolsSearchPolicy({ page: "2" }).path);
  assert.equal(metadata.alternates?.canonical, siteUrl("/tools?page=2"));
});

test("search, filters, and alternative sorts are noindex while remaining crawlable", () => {
  for (const params of [{ q: "AI agents" }, { category: "development" }, { pricing: "FREE" }, { sort: "clicks" }, { platform: "Web" }, { openSource: "1" }, { featured: "1" }, { source: "GITHUB" }, { source: "PRODUCT_HUNT" }]) {
    const policy = toolsSearchPolicy(params);
    assert.equal(policy.index, false);
    assert.deepEqual(pageMetadata("Tools", "Description", policy.path, { index: policy.index }).robots, { index: false, follow: true });
  }
  assert.equal(toolsSearchPolicy({ q: "   " }).index, true);
});

test("malformed crawl parameters cannot reach Prisma as enum values or overflow pagination", () => {
  for (const page of ["-1", "0", "2foo", "1.5", "999999999999999999999", "1000001"]) {
    const policy = toolsSearchPolicy({ page });
    assert.equal(policy.page, 1);
    assert.equal(policy.index, false);
  }
  assert.equal(toolsSearchPolicy({ pricing: "NOT_A_PRICE" }).params.pricing, undefined);
  for (const source of ["NOT_A_SOURCE", "constructor", "__proto__"]) assert.equal(toolsSearchPolicy({ source }).params.source, undefined);
  assert.equal(toolsSearchPolicy({ q: ["one", "two"] }).index, false);
});

test("source filters survive pagination alongside search, pricing, and sort", () => {
  const params = { q: "AI", pricing: "FREE", source: "GITHUB", sort: "newest", focus: "search" };
  assert.equal(toolsPageHref(params, 2), "/tools?q=AI&pricing=FREE&source=GITHUB&sort=newest&page=2");
  assert.equal(toolsPageHref(params, 1), "/tools?q=AI&pricing=FREE&source=GITHUB&sort=newest");
  assert.equal(toolsSearchPolicy({ source: "PRODUCT_HUNT" }).params.source, "PRODUCT_HUNT");
});

test("pagination preserves search and filters and removes only the page-one and UI parameters", () => {
  const params = { q: "AI & code", pricing: "FREE", page: "3", focus: "search" };
  assert.equal(toolsPageHref(params, 2), "/tools?q=AI+%26+code&pricing=FREE&page=2");
  assert.equal(toolsPageHref(params, 1), "/tools?q=AI+%26+code&pricing=FREE");
});

test("JSON-LD cannot terminate its script element and preserves the original structured values", () => {
  const value = { name: '</script><script>alert("x")</script>', description: "line\u2028paragraph\u2029" };
  const serialized = serializeJsonLd(value);
  assert.equal(serialized.includes("<"), false);
  assert.deepEqual(JSON.parse(serialized), value);
});

test("atomic metrics bind untrusted IDs and do not modify content timestamps", () => {
  const id = "x'; DROP TABLE Tool; --";
  for (const metric of ["view", "click"] as const) {
    const query = toolMetricQuery(id, metric);
    assert.deepEqual(query.values, [id]);
    assert.equal(query.sql.includes(id), false);
    assert.equal(query.sql.includes("updatedAt"), false);
    assert.match(query.sql, new RegExp(`${metric}Count.*\\+ 1`));
  }
});

test("sitemap contains only canonical content URLs and no fabricated modification dates", () => {
  const sitemap = buildSitemap([{ slug: "cursor" }], [{ slug: "development" }], [{ slug: "ai-product-builder" }]);
  assert.ok(sitemap.some((entry) => entry.url === siteUrl("/compare/n8n-vs-make-vs-zapier")));
  assert.ok(sitemap.some((entry) => entry.url === siteUrl("/tools/cursor")));
  assert.ok(sitemap.every((entry) => !entry.url.includes("?") && !entry.lastModified));
});

test("an empty catalog sitemap still lists the homepage and static routes", () => {
  const sitemap = buildSitemap([], [], []);
  assert.ok(sitemap.some((entry) => entry.url === siteUrl("/")));
  assert.ok(sitemap.some((entry) => entry.url === siteUrl("/tools")));
  assert.ok(sitemap.some((entry) => entry.url === siteUrl("/categories")));
  assert.equal(sitemap.some((entry) => entry.url.includes("/tools/")), false);
  assert.equal(sitemap.some((entry) => entry.url.includes("/categories/")), false);
});
