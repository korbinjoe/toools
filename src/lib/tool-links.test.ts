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

test("GitHub discovery pages do not create a second repository button", () => {
  const github = "https://github.com/pipedreamhq/pipedream";
  for (const sourceUrl of [
    "https://github.com/search?q=topic%3Aautomation&type=repositories",
    "https://github.com/topics/automation",
    "https://github.com/orgs/microsoft/repositories",
  ]) {
    const tool = { github, sourceUrl, source: "GITHUB_REPOSITORY", url: "https://pipedream.com" };
    assert.deepEqual(getToolExternalLinks(tool).map(({ label, kind }) => ({ label, kind })), [
      { label: "GitHub", kind: "github" },
      { label: "Discovery source", kind: "source" },
    ]);
    assert.equal(getToolOutboundUrl(tool, "github"), github);
    assert.equal(getToolOutboundUrl(tool, "source"), sourceUrl);
    assert.equal(getToolExternalLinks({ ...tool, github: null }).some((link) => link.kind === "github"), false);
  }
});

test("repository URL variants share one GitHub destination", () => {
  const github = "https://github.com/example/tool";
  for (const sourceUrl of [
    "http://www.github.com/Example/Tool.git/",
    `${github}?utm_source=directory#readme`,
    `${github}/blob/main/README.md#L1`,
  ]) {
    const links = getToolExternalLinks({ github, sourceUrl });
    assert.equal(links.length, 1);
    assert.equal(links[0].url, github);
  }
});

test("listing directories are kept distinct and cannot become a tool's repository", () => {
  const sourceUrl = "https://github.com/example/awesome-tools/blob/main/README.md#L12";
  for (const source of ["AWESOME_LIST", "GITHUB_DIRECTORY"]) {
    const tool = { github: null, url: "https://tool.example", sourceUrl, source };
    assert.equal(getToolExternalLinks(tool)[0].kind, "source");
    assert.equal(getToolOutboundUrl(tool, "github"), null);
    assert.equal(getToolOutboundUrl(tool, "source"), sourceUrl);
    assert.equal(getToolExternalLinks({ ...tool, github: "https://github.com/team/tool" }).length, 2);
  }
});

test("repository websites and legacy GitHub profiles retain their GitHub destination", () => {
  const repository = "https://github.com/team/tool";
  assert.equal(getToolOutboundUrl({ github: null, sourceUrl: null, url: repository }, "github"), repository);
  assert.equal(getToolOutboundUrl({ github: "https://github.com/bitwarden", sourceUrl: null, url: "https://bitwarden.com" }, "github"), "https://github.com/bitwarden");
  assert.equal(getToolOutboundUrl({ github: "https://github.com.attacker.com/team/tool", sourceUrl: null, url: "https://example.com" }, "github"), null);
});
