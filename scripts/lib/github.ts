const GITHUB_REPO_RE =
  /^https?:\/\/(?:www\.)?github\.com\/([^/?#]+)\/([^/?#]+)/i;

export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(GITHUB_REPO_RE);
  if (!match) return null;

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");
  if (!owner || !repo || owner === "orgs" || owner === "organizations") {
    return null;
  }

  return { owner, repo };
}

export async function fetchGithubStars(url: string): Promise<number | null> {
  const parsed = parseGithubRepoUrl(url);
  if (!parsed) return null;

  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "toools-importer",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers },
    );

    if (!res.ok) return null;

    const json = (await res.json()) as { stargazers_count?: number };
    return typeof json.stargazers_count === "number" ? json.stargazers_count : null;
  } catch {
    return null;
  }
}
