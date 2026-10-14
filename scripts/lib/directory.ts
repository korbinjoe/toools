import { canonicalRepoUrl, publicHttpUrl } from './import-identity';

export interface DirectoryEntry {
  name: string;
  url: string;
  description: string;
  section: string;
  github?: string;
  line?: number;
}

const cleanText = (text: string) => text.replace(/<[^>]*>/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();

function entry(name: string, url: string, description: string, section: string, line?: number): DirectoryEntry | null {
  const validated = publicHttpUrl(url.replace(/^<|>$/g, ''));
  const cleaned = cleanText(name);
  if (!validated || !cleaned || /(?:shields\.io|badge|github\.com\/(?:topics|collections|sponsors)\/)/i.test(validated)) return null;
  const github = canonicalRepoUrl(validated);
  return { name: cleaned, url: github || validated, description: cleanText(description) || cleaned, section, ...(github ? { github } : {}), ...(line ? { line } : {}) };
}

export function parseDirectory(content: string, format: 'markdown' | 'json' = 'markdown'): DirectoryEntry[] {
  if (format === 'json') {
    const parsed: unknown = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' && 'tools' in parsed ? parsed.tools : null;
    if (!Array.isArray(items)) throw new Error('JSON directory must be an array or an object with a tools array');
    return items.flatMap((item: unknown) => {
      if (!item || typeof item !== 'object' || !('name' in item) || !('url' in item) || typeof item.name !== 'string' || typeof item.url !== 'string') return [];
      const record = item as Record<string, unknown>;
      const tool = entry(item.name, item.url, typeof record.description === 'string' ? record.description : '', typeof record.category === 'string' ? record.category : '');
      if (tool && typeof record.github === 'string') tool.github = canonicalRepoUrl(record.github) || undefined;
      return tool ? [tool] : [];
    });
  }

  const references = new Map<string, string>();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*\[([^\]]+)\]:\s*<?(https?:\/\/[^\s>]+)>?/);
    if (match) references.set(match[1].toLowerCase(), match[2]);
  }
  const tools: DirectoryEntry[] = [];
  let section = '';
  let fence = '';
  for (const [index, line] of lines.entries()) {
    const marker = line.trim().match(/^(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = '';
      continue;
    }
    if (fence) continue;
    const heading = line.match(/^#{1,6}\s+(.+)/);
    if (heading) { section = cleanText(heading[1]); continue; }
    if (!/^\s*(?:[-*+]\s+|\d+[.)]\s+|\|)/.test(line)) continue;
    // Only the first link is a tool; later links are docs, demos, or badges.
    const link = line.match(/(?<!!)\[([^\]]+)\]\((<?https?:\/\/(?:[^\s()]+|\([^\s()]*\))+>?)(?:\s+["'][^"']*["'])?\)/);
    const reference = line.match(/(?<!!)\[([^\]]+)\]\[([^\]]*)\]/);
    const useReference = reference && (!link || reference.index! < link.index!);
    const matched = useReference ? reference : link;
    const name = matched?.[1];
    const url = useReference ? references.get((reference[2] || reference[1]).toLowerCase()) : link?.[2];
    if (!name || !url || !matched || matched.index == null) continue;
    const rest = line.slice(matched.index + matched[0].length).replace(/^[\s*|:–—-]+/, '').replace(/\|\s*$/, '');
    const tool = entry(name, url, rest.replace(/\s*\|\s*/g, ' — '), section, index + 1);
    if (tool) tools.push(tool);
  }
  return tools;
}
