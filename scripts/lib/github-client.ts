export interface GithubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  topics: string[];
  stargazers_count: number;
  archived: boolean;
  private?: boolean;
  disabled: boolean;
  fork: boolean;
  is_template?: boolean;
  default_branch: string;
  license: { spdx_id: string } | null;
}

export class GithubClient {
  private lastRequest = 0;
  private lastSearch = 0;

  constructor(private options: {
    token?: string;
    fetch?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  } = {}) {}

  async get<T>(path: string): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid GitHub API path');
    const now = this.options.now ?? Date.now;
    const sleep = this.options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    const isSearch = path.startsWith('/search/');
    let requestPath = path;
    let redirects = 0;
    for (let attempt = 0; attempt < 3; attempt++) {
      const interval = this.options.token ? 2100 : 6100;
      const delay = Math.max(0, this.lastRequest + 150 - now(), isSearch ? this.lastSearch + interval - now() : 0);
      if (delay) await sleep(delay);
      this.lastRequest = now();
      if (isSearch) this.lastSearch = now();
      let res: Response;
      try {
        res = await (this.options.fetch ?? fetch)(`https://api.github.com${requestPath}`, {
          headers: {
            Accept: 'application/vnd.github+json',
            'User-Agent': 'toools-importer',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(this.options.token ? { Authorization: `Bearer ${this.options.token}` } : {}),
          },
          signal: AbortSignal.timeout(20_000),
          redirect: 'manual',
        });
      } catch (error) {
        if (attempt === 2) throw error;
        await sleep(1000 * (attempt + 1));
        continue;
      }
      if ([301, 302, 307, 308].includes(res.status)) {
        const target = new URL(res.headers.get('location') || '', `https://api.github.com${requestPath}`);
        if (!res.headers.get('location') || target.origin !== 'https://api.github.com' || target.username || target.password || ++redirects > 3) throw new Error('Unsafe or excessive GitHub API redirects');
        await res.body?.cancel();
        requestPath = target.pathname + target.search;
        attempt--;
        continue;
      }
      if (res.ok) {
        try { return await res.json() as T; }
        catch (error) { if (attempt === 2) throw error; await sleep(1000 * (attempt + 1)); continue; }
      }
      const limited = res.status === 429 || (res.status === 403 &&
        (res.headers.get('x-ratelimit-remaining') === '0' || res.headers.has('retry-after')));
      if ((!limited && res.status < 500) || attempt === 2) throw new Error(`GitHub API returned ${res.status}`);
      await res.body?.cancel();
      const retryAfter = res.headers.get('retry-after');
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000;
      const retryMs = retryAfter ? (Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - now()) :
        limited && reset > now() ? reset - now() + 1000 : 1000 * (attempt + 1);
      if (!Number.isFinite(retryMs) || retryMs > 60_000) throw new Error('GitHub rate limit exhausted; retry after the quota resets');
      await sleep(Math.max(1000, retryMs));
    }
    throw new Error('GitHub request failed');
  }

  repository(owner: string, repo: string) {
    return this.get<GithubRepository>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  }

  async search(query: string, limit: number): Promise<GithubRepository[]> {
    const found: GithubRepository[] = [];
    const pageSize = Math.min(100, limit);
    for (let page = 1; page <= 10 && found.length < limit; page++) {
      const params = new URLSearchParams({ q: query, sort: 'stars', order: 'desc', per_page: String(pageSize), page: String(page) });
      const result = await this.get<{ items: GithubRepository[]; incomplete_results: boolean; total_count: number }>(`/search/repositories?${params}`);
      if (result.incomplete_results) throw new Error('Incomplete GitHub search; narrow the query and retry');
      found.push(...result.items);
      if (!result.items.length || found.length >= Math.min(result.total_count, 1000)) break;
    }
    return found.slice(0, limit);
  }

  async organization(org: string, limit: number): Promise<GithubRepository[]> {
    const found: GithubRepository[] = [];
    const pageSize = Math.min(100, limit);
    // A fixed page size keeps pagination stable when the final page is partial.
    for (let page = 1; found.length < limit; page++) {
      const params = new URLSearchParams({ type: 'public', sort: 'pushed', direction: 'desc', per_page: String(pageSize), page: String(page) });
      const items = await this.get<GithubRepository[]>(`/orgs/${encodeURIComponent(org)}/repos?${params}`);
      found.push(...items);
      if (items.length < pageSize) break;
    }
    return found.slice(0, limit);
  }

  async directory(owner: string, repo: string, path: string, ref?: string) {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const result = await this.get<{ type: string; content: string; encoding: string; html_url: string; sha: string }>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}${query}`);
    if (result.type !== 'file' || result.encoding !== 'base64') throw new Error('Directory must be a Markdown or JSON file smaller than 1 MB');
    return { content: Buffer.from(result.content, 'base64').toString('utf8'), sourceUrl: result.html_url, sha: result.sha };
  }
}
