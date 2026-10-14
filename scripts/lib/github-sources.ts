import { readFile } from 'node:fs/promises';
import { type GithubRepository } from './github-client';
import { publicHttpUrl } from './import-identity';

export interface SearchSource { query: string; categoryHint?: string; }
export interface OrganizationSource { owner: string; categoryHint?: string; }
export interface DirectorySource {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
  categoryHint?: string;
  source?: 'AWESOME_LIST' | 'GITHUB_DIRECTORY';
}
export interface GithubSources {
  minStars: number;
  excludeTopics: string[];
  topics: { topic: string; categoryHint?: string }[];
  keywords: SearchSource[];
  organizations: OrganizationSource[];
  directories: DirectorySource[];
}

export function validateSources(input: unknown): GithubSources {
  if (!input || typeof input !== 'object') throw new Error('Source config must be an object');
  const data = input as Record<string, unknown>;
  const minStars = data.minStars ?? 50;
  if (typeof minStars !== 'number' || !Number.isInteger(minStars) || minStars < 0) throw new Error('minStars must be a nonnegative integer');
  const excludeTopics = data.excludeTopics ?? ['awesome-list', 'tutorial', 'tutorials', 'example', 'examples', 'sdk', 'dataset'];
  if (!Array.isArray(excludeTopics) || excludeTopics.some((t) => typeof t !== 'string')) throw new Error('excludeTopics must be a string array');
  const result: GithubSources = { minStars, excludeTopics, topics: [], keywords: [], organizations: [], directories: [] };
  const shapes = { topics: ['topic'], keywords: ['query'], organizations: ['owner'], directories: ['owner', 'repo', 'path'] } as const;
  for (const [key, required] of Object.entries(shapes)) {
    const items = data[key] ?? [];
    if (!Array.isArray(items)) throw new Error(`${key} must be an array`);
    for (const item of items) {
      if (!item || typeof item !== 'object') throw new Error(`Invalid ${key} source`);
      const value = item as Record<string, unknown>;
      for (const field of required) if (typeof value[field] !== 'string' || !String(value[field]).trim()) throw new Error(`${key}.${field} must be a nonempty string`);
      for (const field of ['categoryHint', 'ref']) if (value[field] !== undefined && (typeof value[field] !== 'string' || !value[field])) throw new Error(`Invalid ${field}`);
      if (value.owner && !/^[a-z\d-]+$/i.test(String(value.owner))) throw new Error('Invalid organization/repository owner');
      if (value.repo && !/^[a-z\d_.-]+$/i.test(String(value.repo))) throw new Error('Invalid repository name');
      if (value.topic && !/^[a-z\d-]+$/i.test(String(value.topic))) throw new Error('Invalid topic');
      if (key === 'directories') {
        const path = String(value.path);
        if (path.startsWith('/') || path.split('/').includes('..') || !/\.(md|markdown|json)$/i.test(path)) throw new Error('Directory path must point to a Markdown or JSON file');
        if (value.source && !['AWESOME_LIST', 'GITHUB_DIRECTORY'].includes(String(value.source))) throw new Error('Invalid directory source type');
      }
    }
    Object.assign(result, { [key]: items });
  }
  return result;
}

export async function loadSources(path: string) {
  return validateSources(JSON.parse(await readFile(path, 'utf8')));
}

export function repositorySkipReason(repo: GithubRepository, config: Pick<GithubSources, 'minStars' | 'excludeTopics'>): string | null {
  if (!Number.isSafeInteger(repo.id) || repo.id < 1 || !publicHttpUrl(repo.html_url)) return 'invalid-repository';
  if (repo.private) return 'private-repository';
  if (repo.archived || repo.disabled || repo.fork || repo.is_template) return 'archived-fork-disabled-or-template';
  if (repo.stargazers_count < config.minStars) return 'below-star-threshold';
  if (!repo.description?.trim()) return 'missing-description';
  if ((repo.topics || []).some((topic) => config.excludeTopics.includes(topic.toLowerCase())) || /^(awesome[-_]|.*[-_](tutorials?|examples?|sdk|dataset)s?$)/i.test(repo.name)) return 'directory-tutorial-sdk-or-dataset';
  return null;
}

// Recognized common open-source SPDX IDs only. Missing/NOASSERTION/custom
// licenses remain unverified; a GitHub URL alone does not prove open source.
const OPEN_SOURCE_LICENSES = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', 'MPL-2.0', 'GPL-2.0', 'GPL-3.0', 'AGPL-3.0', 'LGPL-2.1', 'LGPL-3.0', 'EPL-1.0', 'EPL-2.0', 'Zlib', 'Unlicense']);
export function verifiedOpenSource(spdxId?: string | null): boolean {
  return Boolean(spdxId && OPEN_SOURCE_LICENSES.has(spdxId.replace(/-(only|or-later)$/, '')));
}
