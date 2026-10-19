// The cloud recovery entry point owns migration, credential rotation, SQL
// execution, cache invalidation, and deployment creation. These checks deliberately
// have no filesystem or credential discovery and perform no work on import.
export const ISSUE_9 = {
  repository: "korbinjoe/toools",
  number: 9,
  slug: "mangatranslate",
  category: "image-media",
  origin: "https://toools.top",
  sourceUrl: "https://github.com/korbinjoe/toools/issues/9",
  completionMarker: "<!-- toools:issue-9:publication-complete:v1 -->",
} as const;

export type BoundQuery = (text: string, values: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;

export const ISSUE_9_VERIFICATION_SQL = `
SELECT t.id, t.name, t.slug, t.status::text AS status, t.pricing::text AS pricing,
       t.url, t.platforms, c.slug AS "categorySlug",
       ARRAY(SELECT tag.slug FROM "ToolTag" tt JOIN "Tag" tag ON tag.id = tt."tagId"
             WHERE tt."toolId" = t.id ORDER BY tag.slug) AS tags,
       EXISTS(SELECT 1 FROM "ToolIdentity" i WHERE i."toolId" = t.id AND i.key = $2) AS "hasIdentity",
       EXISTS(SELECT 1 FROM "ToolDiscovery" d WHERE d."toolId" = t.id
              AND d.source = 'MANUAL' AND d.method = 'issue'
              AND d."sourceKey" = $3 AND d."sourceUrl" = $4) AS "hasIssueProvenance"
FROM "Tool" t JOIN "Category" c ON c.id = t."categoryId" WHERE t.slug = $1`;

export async function verifyIssue9Database(query: BoundQuery) {
  const { rows } = await query(ISSUE_9_VERIFICATION_SQL, [ISSUE_9.slug, "url:mangatranslate.com", "korbinjoe/toools#9", ISSUE_9.sourceUrl]);
  const row = rows[0];
  const tags = row?.tags;
  if (rows.length !== 1 || !row || typeof row.id !== "string" || !row.id
    || row.name !== "MangaTranslate" || row.slug !== ISSUE_9.slug
    || row.status !== "APPROVED" || row.pricing !== "FREEMIUM"
    || row.url !== "https://www.mangatranslate.com/" || row.categorySlug !== ISSUE_9.category
    || !Array.isArray(row.platforms) || !row.platforms.includes("Web")
    || !Array.isArray(tags) || !["ai", "image-editing"].every((tag) => tags.includes(tag))
    || row.hasIdentity !== true || row.hasIssueProvenance !== true) {
    throw new Error("Issue #9 database verification failed; leave the issue open and inspect the publication transaction");
  }
  return { toolId: row.id, slug: ISSUE_9.slug };
}

export type TransportOptions = { fetcher?: typeof fetch };
export type WaitOptions = TransportOptions & {
  token: string;
  teamId: string;
  projectId: string;
  deploymentId: string;
  expectedSha: string;
  productionHost?: string;
  maxAttempts?: number;
  intervalMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
};

async function requestJson(fetcher: typeof fetch, url: string, init: RequestInit, description: string): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(url, { ...init, redirect: "error", signal: AbortSignal.timeout(20_000) });
  } catch {
    // Never echo provider/network exception bodies, which can contain headers.
    throw new Error(`${description} request failed`);
  }
  if (!response.ok) throw new Error(`${description} failed (HTTP ${response.status})`);
  const value: unknown = await response.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${description} returned invalid JSON`);
  return value as Record<string, unknown>;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function waitForVercelDeployment(options: WaitOptions) {
  if (!/^[a-f0-9]{40}$/i.test(options.expectedSha)) throw new Error("A complete expected Git commit SHA is required");
  if (!/^dpl_[a-z0-9]+$/i.test(options.deploymentId)) throw new Error("A Vercel deployment ID is required");
  const fetcher = options.fetcher ?? fetch;
  const pause = options.sleep ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const attempts = options.maxAttempts ?? 60;
  const interval = options.intervalMs ?? 10_000;
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 120 || !Number.isFinite(interval) || interval < 0 || interval > 30_000) {
    throw new Error("Invalid deployment polling budget");
  }
  const endpoint = new URL(`https://api.vercel.com/v13/deployments/${encodeURIComponent(options.deploymentId)}`);
  endpoint.searchParams.set("teamId", options.teamId);
  endpoint.searchParams.set("withGitRepoInfo", "true");
  for (let attempt = 0; attempt < attempts; attempt++) {
    const deployment = await requestJson(fetcher, endpoint.toString(), {
      headers: { Authorization: `Bearer ${options.token}` },
    }, "Vercel deployment lookup");
    if (deployment.id !== options.deploymentId || deployment.projectId !== options.projectId || deployment.target !== "production") {
      throw new Error("Vercel deployment identity, project, or production target does not match");
    }
    const shaCandidates = [object(deployment.gitSource).sha, object(deployment.gitMetadata).commitSha, object(deployment.meta).githubCommitSha]
      .filter((sha): sha is string => typeof sha === "string");
    if (!shaCandidates.length || shaCandidates.some((sha) => sha.toLowerCase() !== options.expectedSha.toLowerCase())) {
      throw new Error("Vercel deployment does not contain the expected Git commit");
    }
    if (["ERROR", "CANCELED"].includes(String(deployment.readyState)) || deployment.aliasError) {
      throw new Error("Vercel production deployment or alias assignment failed");
    }
    const aliases = Array.isArray(deployment.alias) ? deployment.alias : [];
    const productionHost = options.productionHost ?? new URL(ISSUE_9.origin).hostname;
    if (deployment.readyState === "READY" && deployment.aliasAssigned === true
      && aliases.includes(productionHost)) {
      // deployment.alias records aliases assigned when this deployment was
      // created. An old READY deployment can retain that history after another
      // deployment takes over the domain, so verify the current alias separately.
      const aliasEndpoint = new URL(`https://api.vercel.com/v4/aliases/${encodeURIComponent(productionHost)}`);
      aliasEndpoint.searchParams.set("teamId", options.teamId);
      aliasEndpoint.searchParams.set("projectId", options.projectId);
      const alias = await requestJson(fetcher, aliasEndpoint.toString(), {
        headers: { Authorization: `Bearer ${options.token}` },
      }, "Vercel production alias lookup");
      if (alias.alias !== productionHost || alias.projectId !== options.projectId || alias.deploymentId !== options.deploymentId) {
        throw new Error("Vercel production domain no longer points to the expected deployment");
      }
      // Return only safe identifiers, never the full API object (it can contain env).
      return { deploymentId: options.deploymentId, sha: options.expectedSha };
    }
    if (attempt + 1 < attempts) await pause(interval);
  }
  throw new Error("Vercel production deployment did not become ready within the polling budget");
}

function publicationOrigin(origin: string = ISSUE_9.origin) {
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Publication origin must be a bare HTTPS origin");
  }
  return url.origin;
}

function htmlWithoutScripts(html: string) {
  // A serialized React payload can contain links/text without any visible result.
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
}

function hasLink(html: string, path: string, origin: string) {
  const matches = html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi);
  for (const match of matches) {
    try {
      const href = new URL(match[2].replaceAll("&amp;", "&"), origin);
      if (href.origin === origin && href.pathname === path && !href.search && !href.hash) return true;
    } catch { /* malformed href is not publication evidence */ }
  }
  return false;
}

function hasApprovedSoftwareMetadata(html: string) {
  for (const match of html.matchAll(/<script\b[^>]*\btype\s*=\s*(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try {
      const metadata = object(JSON.parse(match[2]));
      if (metadata["@type"] === "SoftwareApplication" && metadata.name === "MangaTranslate"
        && metadata.url === "https://www.mangatranslate.com/" && metadata.applicationCategory === "Image & Media") return true;
    } catch { /* invalid structured data cannot prove the website identity */ }
  }
  return false;
}

export async function verifyIssue9Online(options: TransportOptions & { origin?: string } = {}) {
  const origin = publicationOrigin(options.origin);
  const fetcher = options.fetcher ?? fetch;
  const paths = ["/", `/tools/${ISSUE_9.slug}`, `/categories/${ISSUE_9.category}`, "/tools?q=MangaTranslate", "/sitemap.xml"];
  const bodies = new Map<string, string>();
  let approvedSoftwareMetadata = false;
  for (const path of paths) {
    let response: Response;
    try {
      response = await fetcher(`${origin}${path}`, {
        headers: { Accept: path.endsWith(".xml") ? "application/xml,text/xml" : "text/html" },
        redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000),
      });
    } catch { throw new Error(`Live publication verification could not load ${path}`); }
    if (response.status !== 200) throw new Error(`Live publication verification failed for ${path} (HTTP ${response.status})`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!(path.endsWith(".xml") ? /(?:application|text)\/xml/i : /text\/html/i).test(contentType)) {
      throw new Error(`Live publication verification received the wrong content type for ${path}`);
    }
    const body = await response.text();
    if (path === paths[1]) approvedSoftwareMetadata = hasApprovedSoftwareMetadata(body);
    bodies.set(path, htmlWithoutScripts(body));
  }
  const detail = bodies.get(paths[1])!;
  const heading = detail.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1].replace(/<[^>]*>/g, "").trim();
  if (heading !== "MangaTranslate" || !approvedSoftwareMetadata
    || !hasLink(detail, `/api/tools/${ISSUE_9.slug}/out`, origin)
    || !detail.includes("Image &amp; Media") && !detail.includes("Image & Media")) {
    throw new Error("Live tool detail does not show the approved MangaTranslate listing");
  }
  for (const path of [paths[2], paths[3]]) {
    if (!hasLink(bodies.get(path)!, `/tools/${ISSUE_9.slug}`, origin)) {
      throw new Error(`Live publication verification found no MangaTranslate result on ${path}`);
    }
  }
  if (!hasLink(bodies.get("/")!, "/tools", origin)) throw new Error("Live homepage has no catalog navigation");
  const sitemapLocations = [...bodies.get("/sitemap.xml")!.matchAll(/<loc\b[^>]*>\s*([^<]+)\s*<\/loc\s*>/gi)].map((match) => match[1].trim());
  if (!sitemapLocations.includes(`${origin}/tools/${ISSUE_9.slug}`)) throw new Error("Live sitemap does not include MangaTranslate");
  return { origin, listingUrl: `${origin}/tools/${ISSUE_9.slug}`, checkedPaths: paths };
}

export type CompletionOptions = TransportOptions & {
  token: string;
  // The workflow's GITHUB_TOKEN posts as github-actions[bot]. Tests or an
  // explicitly configured user token can supply its actual author login.
  authorLogin?: string;
  origin?: string;
};

export function issue9CompletionBody(origin: string = ISSUE_9.origin) {
  const checkedOrigin = publicationOrigin(origin);
  return `${ISSUE_9.completionMarker}\n\nMangaTranslate 已完成线上收录：${checkedOrigin}/tools/${ISSUE_9.slug}\n\n已核对工具详情、Image & Media 分类、搜索结果及 sitemap，Neon 服务已恢复。感谢提交！`;
}

async function findCompletionComment(options: CompletionOptions) {
  const fetcher = options.fetcher ?? fetch;
  for (let page = 1; page <= 100; page++) {
    let response: Response;
    try {
      response = await fetcher(`https://api.github.com/repos/${ISSUE_9.repository}/issues/${ISSUE_9.number}/comments?per_page=100&page=${page}`, {
        headers: githubHeaders(options.token), redirect: "error", signal: AbortSignal.timeout(20_000),
      });
    } catch { throw new Error("GitHub comment lookup request failed"); }
    if (!response.ok) throw new Error(`GitHub comment lookup failed (HTTP ${response.status})`);
    const comments: unknown = await response.json().catch(() => null);
    if (!Array.isArray(comments)) throw new Error("GitHub comment lookup returned invalid JSON");
    for (const candidate of comments) {
      const comment = object(candidate);
      if (typeof comment.body === "string" && comment.body.includes(ISSUE_9.completionMarker)
        && object(comment.user).login === (options.authorLogin ?? "github-actions[bot]")) {
        if (typeof comment.id !== "number" || typeof comment.html_url !== "string") throw new Error("GitHub completion comment has an invalid identity");
        return { id: comment.id, url: comment.html_url };
      }
    }
    if (comments.length < 100) return null;
  }
  throw new Error("GitHub comment pagination budget exhausted; refusing to post a possible duplicate");
}

function githubHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "Content-Type": "application/json" };
}

// Call only after DB verification, cache refresh, the expected production
// deployment, and every live HTTP check succeed. Concurrent workflow runs must
// share a GitHub Actions concurrency group; the comments API has no idempotency key.
export async function completeIssue9(options: CompletionOptions) {
  const fetcher = options.fetcher ?? fetch;
  const endpoint = `https://api.github.com/repos/${ISSUE_9.repository}/issues/${ISSUE_9.number}`;
  const init = { headers: githubHeaders(options.token) };
  const issue = await requestJson(fetcher, endpoint, init, "GitHub issue lookup");
  if (issue.number !== ISSUE_9.number || issue.pull_request || !["open", "closed"].includes(String(issue.state))) {
    throw new Error("GitHub issue identity does not match the authorized submission");
  }
  let comment = await findCompletionComment(options);
  let commentCreated = false;
  if (!comment) {
    // Do not retry POST on an uncertain network result: the next run first scans
    // for the marker and safely resumes the close step after a successful comment.
    const created = await requestJson(fetcher, `${endpoint}/comments`, {
      ...init, method: "POST", body: JSON.stringify({ body: issue9CompletionBody(options.origin) }),
    }, "GitHub completion comment");
    if (typeof created.id !== "number" || typeof created.html_url !== "string") throw new Error("GitHub completion comment returned an invalid identity");
    comment = { id: created.id, url: created.html_url };
    commentCreated = true;
  }
  if (issue.state !== "closed" || issue.state_reason !== "completed") {
    const closed = await requestJson(fetcher, endpoint, {
      ...init, method: "PATCH", body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    }, "GitHub issue close");
    if (closed.state !== "closed" || closed.state_reason !== "completed") throw new Error("GitHub did not confirm issue #9 was completed");
  }
  return { issueNumber: ISSUE_9.number, commentCreated, commentUrl: comment.url, state: "closed" as const };
}
