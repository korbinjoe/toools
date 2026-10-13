export const SITE_NAME = "Toools";
export const SITE_TAGLINE = "Find the right tools for your entire workflow.";
export const SITE_TITLE = "Toools — Find the Right Tools for Your Entire Workflow";
export const SITE_DESCRIPTION =
  "Discover tools from Product Hunt, GitHub Awesome lists, and community submissions, with workflow recommendations and transparent selection rules.";
export const SITE_OG_DESCRIPTION =
  "Tools from Product Hunt, GitHub Awesome lists, and our community. Explore workflow picks with transparent sources and selection rules.";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://toools.top"
).replace(/\/$/, "");

export const GITHUB_REPO_URL = "https://github.com/korbinjoe/toools";
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const GITHUB_NEW_ISSUE_URL =
  `${GITHUB_REPO_URL}/issues/new?template=tool-submission.yml`;
