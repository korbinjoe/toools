type ToolLinkData = {
  github: string | null;
  sourceUrl: string | null;
  url?: string;
  source?: string | null;
};

export type ToolExternalLink = {
  destination: "github" | "source";
  label: string;
  url: string;
  kind: "github" | "product-hunt" | "source";
};

function externalUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

function githubRepositoryUrl(value: string | null) {
  const url = externalUrl(value);
  if (!url || url.hostname.toLowerCase().replace(/^www\./, "") !== "github.com") return null;
  const [owner, rawRepo] = url.pathname.split("/").filter(Boolean);
  const repo = rawRepo?.replace(/\.git$/i, "");
  if (!owner || !repo || ["search", "orgs", "organizations", "topics", "collections", "settings", "marketplace", "features", "sponsors", "users"].includes(owner.toLowerCase())) return null;
  if (!/^[a-z\d-]+$/i.test(owner) || !/^[a-z\d_.-]+$/i.test(repo)) return null;
  return `https://github.com/${owner}/${repo}`;
}

export function getToolGithubUrl(tool: ToolLinkData) {
  const repository = githubRepositoryUrl(tool.github);
  if (repository) return repository;
  const github = externalUrl(tool.github);
  const owner = github?.pathname.replace(/^\/|\/$/g, "");
  if (github?.hostname.toLowerCase().replace(/^www\./, "") === "github.com" && owner && /^[a-z\d-]+$/i.test(owner) && !["search", "orgs", "organizations", "topics", "collections", "settings", "marketplace", "features", "sponsors", "users"].includes(owner.toLowerCase())) return `https://github.com/${owner}`;
  const websiteRepository = githubRepositoryUrl(tool.url ?? null);
  if (websiteRepository) return websiteRepository;
  // A directory's repository belongs to the listing, not necessarily the tool.
  if (tool.source === "AWESOME_LIST" || tool.source === "GITHUB_DIRECTORY") return null;
  return githubRepositoryUrl(tool.sourceUrl);
}

export function getToolExternalLinks(tool: ToolLinkData): ToolExternalLink[] {
  const links: ToolExternalLink[] = [];
  const github = getToolGithubUrl(tool);
  if (github) links.push({ destination: "github", url: github, kind: "github", label: "GitHub" });

  const source = externalUrl(tool.sourceUrl);
  if (source) {
    const sourceRepository = githubRepositoryUrl(source.href);
    if (github && sourceRepository?.toLowerCase() === github.toLowerCase()) return links;
    const host = source.hostname.toLowerCase().replace(/^www\./, "");
    const isProductHunt = host === "producthunt.com";
    const label = isProductHunt ? "Product Hunt"
      : tool.source === "AWESOME_LIST" ? "Awesome List"
      : tool.source === "GITHUB_DIRECTORY" ? "GitHub directory"
      : host === "github.com" ? "Discovery source"
      : "Original source";
    links.push({ destination: "source", url: source.href, kind: isProductHunt ? "product-hunt" : "source", label });
  }
  return links;
}

// Resolve only destinations stored on the approved tool, never a user-supplied URL.
export function getToolOutboundUrl(tool: ToolLinkData & { url: string }, destination: string) {
  if (destination === "website") return externalUrl(tool.url)?.href ?? null;
  return getToolExternalLinks(tool).find((link) => link.destination === destination)?.url ?? null;
}
