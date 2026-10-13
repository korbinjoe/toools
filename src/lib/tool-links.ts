type ToolLinkData = {
  github: string | null;
  sourceUrl: string | null;
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

export function getToolExternalLinks(tool: ToolLinkData): ToolExternalLink[] {
  const links: ToolExternalLink[] = [];
  for (const destination of ["github", "source"] as const) {
    const url = externalUrl(destination === "github" ? tool.github : tool.sourceUrl);
    if (!url || links.some((link) => link.url.replace(/\/$/, "") === url.href.replace(/\/$/, ""))) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const kind = host === "github.com" ? "github" : host === "producthunt.com" ? "product-hunt" : "source";
    links.push({
      destination,
      url: url.href,
      kind,
      label: kind === "github" ? "GitHub" : kind === "product-hunt" ? "Product Hunt" : "Original source",
    });
  }
  return links;
}

// Resolve only destinations stored on the approved tool, never a user-supplied URL.
export function getToolOutboundUrl(tool: ToolLinkData & { url: string }, destination: string) {
  if (destination === "website") return externalUrl(tool.url)?.href ?? null;
  return getToolExternalLinks(tool).find((link) => link.destination === destination)?.url ?? null;
}
