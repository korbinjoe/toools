import assert from "node:assert/strict";
import test from "node:test";
import {
  getDiscoveryIndex,
  selectHomeDiscovery,
  selectRecentTools,
} from "./home-discovery";

const tool = (slug: string, category = "video") => ({
  slug,
  category: { slug: category },
  createdAt: new Date("2026-10-13T00:00:00+08:00"),
});

test("category variety never promotes months-old tools into recent additions", () => {
  const current = Array.from({ length: 7 }, (_, index) => tool("new" + index));
  const old = { ...tool("old", "design"), createdAt: new Date("2026-05-28") };
  assert.deepEqual(selectRecentTools([...current, old]), current.slice(0, 6));
});

test("recent tools keep the newest entries while making room for other categories", () => {
  const pool = [
    tool("v1"),
    tool("v2"),
    tool("v3"),
    tool("v4"),
    tool("a1", "ai"),
    tool("a2", "ai"),
    tool("d1", "design"),
    tool("d2", "design"),
  ];
  assert.deepEqual(
    selectRecentTools(pool).map((t) => t.slug),
    ["v1", "v2", "a1", "a2", "d1", "d2"],
  );
});

test("a single category still fills the available recent slots in date order", () => {
  const pool = Array.from({ length: 8 }, (_, index) => tool(String(index)));
  assert.deepEqual(selectRecentTools(pool), pool.slice(0, 6));
});

test("sparse and empty collections have no invented or repeated entries", () => {
  assert.deepEqual(selectRecentTools([]), []);
  assert.deepEqual(
    selectRecentTools([tool("a"), tool("a"), tool("b")]).map((t) => t.slug),
    ["a", "b"],
  );
  assert.deepEqual(selectHomeDiscovery([], []), {
    recent: [],
    discoveries: [],
    picks: [],
  });
});

test("all discovery alternatives are reserved so switching cannot duplicate another module", () => {
  const featured = Array.from({ length: 12 }, (_, index) =>
    tool("f" + index, "ai"),
  );
  const recentPool = [
    featured[0],
    ...Array.from({ length: 6 }, (_, index) => tool("r" + index)),
  ];
  const { recent, discoveries, picks } = selectHomeDiscovery(
    featured,
    recentPool,
  );
  const slugs = [...recent, ...discoveries, ...picks].map((t) => t.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(recent.length, 6);
  assert.equal(discoveries.length, 6);
  assert.equal(picks.length, 4);
});

test("discovery can use the collection when editorial candidates are exhausted", () => {
  const recentPool = Array.from({ length: 9 }, (_, index) => tool("r" + index));
  const { recent, discoveries, picks } = selectHomeDiscovery([], recentPool);
  assert.equal(recent.length, 6);
  assert.deepEqual(
    discoveries.map((t) => t.slug),
    ["r6", "r7"],
  );
  assert.deepEqual(picks, []);
});

test("the default discovery stays stable within an editorial day and changes at midnight", () => {
  const morning = new Date("2026-10-13T00:00:00+08:00");
  const evening = new Date("2026-10-13T23:59:59+08:00");
  const tomorrow = new Date("2026-10-14T00:00:00+08:00");
  assert.equal(getDiscoveryIndex(6, morning), getDiscoveryIndex(6, evening));
  assert.equal(
    getDiscoveryIndex(6, tomorrow),
    (getDiscoveryIndex(6, evening) + 1) % 6,
  );
  assert.equal(getDiscoveryIndex(0, morning), 0);
  assert.equal(getDiscoveryIndex(1, morning), 0);
});
