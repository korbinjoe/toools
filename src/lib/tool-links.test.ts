import assert from "node:assert/strict";
import test from "node:test";
import { getToolExternalLinks, getToolOutboundUrl } from "./tool-links";

test("tools expose stored GitHub and Product Hunt destinations", () => {
  const tool = { github: "https://github.com/example/tool", sourceUrl: "https://www.producthunt.com/posts/tool" };
  const links = getToolExternalLinks(tool);
  assert.deepEqual(links.map(({ label, destination }) => ({ label, destination })), [
    { label: "GitHub", destination: "github" },
    { label: "Product Hunt", destination: "source" },
  ]);
  assert.equal(getToolOutboundUrl({ ...tool, url: "https://example.com" }, "source"), tool.sourceUrl);
});

test("other listing sources retain their actual URL and duplicate repositories appear once", () => {
  const repo = "https://github.com/example/tool";
  assert.equal(getToolExternalLinks({ github: repo, sourceUrl: `${repo}/` }).length, 1);
  assert.equal(getToolExternalLinks({ github: null, sourceUrl: repo })[0].label, "GitHub");
  assert.equal(getToolExternalLinks({ github: null, sourceUrl: "https://example.com/tool" })[0].label, "Original source");
});

test("missing and unsafe links are hidden and cannot be used as redirect destinations", () => {
  for (const value of [null, "", "invalid", "/local", "javascript:alert(1)", "data:text/html,hello", "https://user:password@example.com"]) {
    const tool = { url: "https://example.com", github: value, sourceUrl: value };
    assert.deepEqual(getToolExternalLinks(tool), []);
    assert.equal(getToolOutboundUrl(tool, "github"), null);
    assert.equal(getToolOutboundUrl(tool, "source"), null);
  }
});

test("only stored destinations can redirect and website remains the default destination", () => {
  const tool = { url: "https://example.com/", github: null, sourceUrl: "https://producthunt.com/posts/tool" };
  assert.equal(getToolOutboundUrl(tool, "website"), tool.url);
  for (const destination of ["https://attacker.com", "url", "__proto__", "constructor", ""]) {
    assert.equal(getToolOutboundUrl(tool, destination), null);
  }
  assert.equal(getToolExternalLinks({ github: null, sourceUrl: "https://producthunt.com.attacker.com/posts/tool" })[0].kind, "source");
});
