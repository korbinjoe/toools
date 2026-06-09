export const SITE_NAME = "Toools";
export const SITE_TAGLINE = "Find the right tools for your entire workflow.";
export const SITE_TITLE = "Toools — Find the Right Tools for Your Entire Workflow";
export const SITE_DESCRIPTION =
  "Curated tool stacks for indie devs, creators, and startups. Browse 100+ tools with trust signals, or follow a complete workflow from idea to launch.";
export const SITE_OG_DESCRIPTION =
  "Scenario-first tool stacks and a searchable directory with trust signals, comparisons, and editor picks.";
export const SITE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL || "https://toools.dev"
).replace(/\/$/, "");

export const GITHUB_REPO_URL = "https://github.com/korbinjoe/toools";
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const GITHUB_NEW_ISSUE_URL =
  `${GITHUB_REPO_URL}/issues/new?template=tool-submission.yml`;
