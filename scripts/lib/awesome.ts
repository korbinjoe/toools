const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";

export interface AwesomeRepo {
  owner: string;
  repo: string;
  categoryHint?: string;
}

export const AWESOME_REPOS: AwesomeRepo[] = [
  { owner: "awesome-selfhosted", repo: "awesome-selfhosted" },
  { owner: "jaywcjlove", repo: "awesome-mac", categoryHint: "productivity" },
  { owner: "goabstract", repo: "Awesome-Design-Tools", categoryHint: "design" },
  { owner: "bradtraversy", repo: "design-resources-for-developers", categoryHint: "design" },
  { owner: "agarrharr", repo: "awesome-cli-apps", categoryHint: "development" },
  { owner: "rothgar", repo: "awesome-tuis", categoryHint: "development" },
  { owner: "analysis-tools-dev", repo: "static-analysis", categoryHint: "development" },
  { owner: "trimstray", repo: "the-book-of-secret-knowledge", categoryHint: "security-privacy" },
  { owner: "kahun", repo: "awesome-sysadmin", categoryHint: "deploy-hosting" },
  { owner: "n1trux", repo: "awesome-sysadmin", categoryHint: "deploy-hosting" },
  { owner: "maguowei", repo: "starred", categoryHint: "development" },
];

export interface ParsedAwesomeTool {
  name: string;
  url: string;
  description: string;
  section: string;
  github?: string;
}

export async function fetchAwesomeReadme(owner: string, repo: string): Promise<string> {
  const branches = ["main", "master"];
  const filenames = ["README.md", "readme.md"];

  for (const branch of branches) {
    for (const filename of filenames) {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filename}`;
      const res = await fetch(rawUrl, {
        headers: { "User-Agent": "toools-importer" },
      });
      if (res.ok) {
        return res.text();
      }
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3.raw",
    "User-Agent": "toools-importer",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/readme`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    throw new Error(`Failed to fetch README for ${owner}/${repo} (${res.status})`);
  }

  return res.text();
}

export function parseAwesomeReadme(content: string): ParsedAwesomeTool[] {
  const tools: ParsedAwesomeTool[] = [];
  let currentSection = "";

  for (const line of content.split("\n")) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      currentSection = headingMatch[1].trim().replace(/[*_`]/g, "");
      continue;
    }

    const itemMatch = line.match(
      /^[\s]*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[-–—:]\s*(.+)/,
    );
    if (itemMatch) {
      const [, name, url, description] = itemMatch;

      if (url.startsWith("#") || url.startsWith("/") || url.includes("shields.io")) {
        continue;
      }
      if (!url.startsWith("http")) {
        continue;
      }

      const isGithub = url.includes("github.com");
      tools.push({
        name: name.trim(),
        url: url.trim(),
        description: description.trim().replace(/\*\*$/, "").replace(/`/g, ""),
        section: currentSection,
        github: isGithub ? url.trim() : undefined,
      });
      continue;
    }

    const simpleMatch = line.match(/^[\s]*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*$/);
    if (simpleMatch) {
      const [, name, url] = simpleMatch;
      if (url.startsWith("http") && !url.includes("shields.io")) {
        tools.push({
          name: name.trim(),
          url: url.trim(),
          description: name.trim(),
          section: currentSection,
          github: url.includes("github.com") ? url.trim() : undefined,
        });
      }
    }
  }

  return tools;
}
