import { parseGithubRepoUrl } from './github';

export function publicHttpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
        host === '[::1]' || host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host) || !host.includes('.')) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function canonicalRepoUrl(value: string): string | null {
  const repo = parseGithubRepoUrl(value);
  return repo ? `https://github.com/${repo.owner.toLowerCase()}/${repo.repo.toLowerCase()}` : null;
}

// Preserve meaningful query strings (e.g. separate apps sharing one endpoint).
export function normalizedToolUrl(value: string): string {
  const repo = canonicalRepoUrl(value);
  if (repo) return repo.replace('https://', '');
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid|ref_src)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.host.toLowerCase().replace(/^www\./, '') + url.pathname.replace(/\/+$/, '') + url.search;
}

export function identityKeys(tool: { url: string; github?: string | null; repositoryId?: string | null }): string[] {
  const keys = new Set([`url:${normalizedToolUrl(tool.url)}`]);
  const repo = canonicalRepoUrl(tool.github || tool.url);
  if (repo) keys.add(`repo:${repo.replace('https://github.com/', '')}`);
  if (tool.repositoryId) keys.add(`github-id:${tool.repositoryId}`);
  return [...keys];
}
