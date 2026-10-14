export function parseGithubRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
        parsed.hostname.replace(/^www\./, '').toLowerCase() !== 'github.com') return null;
    const parts = parsed.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    if (parts.length !== 2) return null;
    const [owner, rawRepo] = parts;
    const repo = rawRepo.replace(/\.git$/i, '');
    if (['orgs', 'organizations', 'topics', 'collections', 'settings', 'marketplace', 'features', 'sponsors'].includes(owner.toLowerCase()) ||
        !/^[a-z\d-]+$/i.test(owner) || !/^[a-z\d_.-]+$/i.test(repo)) return null;
    return { owner, repo };
  } catch {
    return null;
  }
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
