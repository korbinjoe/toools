const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "ai-assistants": [
    "ai", "artificial-intelligence", "machine-learning", "llm", "chatbot",
    "gpt", "language-model", "nlp", "deep-learning", "neural",
  ],
  design: [
    "design", "ui", "ux", "prototyping", "figma", "sketch", "color",
    "typography", "icon", "illustration", "wireframe", "mockup",
  ],
  development: [
    "developer-tools", "code", "editor", "ide", "programming", "sdk",
    "framework", "library", "debugging", "testing", "git", "terminal",
    "cli", "devtools", "sandbox",
  ],
  "writing-notes": [
    "writing", "note", "documentation", "markdown", "wiki", "knowledge-base",
    "journal", "text-editor", "blogging", "cms",
  ],
  "image-media": [
    "image", "photo", "graphics", "svg", "png", "compression", "editing",
    "stock-photo", "screenshot", "ocr", "image-generation",
  ],
  "video-audio": [
    "video", "audio", "podcast", "streaming", "recording", "music",
    "transcription", "subtitle", "animation", "screen-recording",
  ],
  "seo-marketing": [
    "seo", "marketing", "email-marketing", "social-media", "advertising",
    "growth", "conversion", "copywriting", "branding", "newsletter",
  ],
  "data-analytics": [
    "analytics", "dashboard", "data", "visualization", "bi",
    "business-intelligence", "spreadsheet", "database", "sql", "charts",
  ],
  productivity: [
    "productivity", "task-management", "calendar", "project-management",
    "collaboration", "workflow", "automation", "time-tracking", "meeting",
    "todo", "kanban",
  ],
  "api-integration": [
    "api", "integration", "webhook", "rest", "graphql", "automation",
    "zapier", "middleware", "connector", "sdk",
  ],
  "deploy-hosting": [
    "hosting", "deploy", "deployment", "cloud", "serverless", "cdn",
    "infrastructure", "devops", "ci-cd", "container", "docker", "kubernetes",
  ],
  "security-privacy": [
    "security", "privacy", "password", "encryption", "vpn", "authentication",
    "firewall", "vulnerability", "compliance", "audit",
  ],
};

export function matchCategory(hints: string[]): string {
  const normalizedHints = hints.map((h) =>
    h.toLowerCase().replace(/[^a-z0-9-]/g, "-")
  );

  let bestMatch = "productivity";
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const hint of normalizedHints) {
      for (const keyword of keywords) {
        if (hint.includes(keyword) || keyword.includes(hint)) {
          score++;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = category;
    }
  }

  return bestMatch;
}

export const PH_TOPIC_MAP: Record<string, string> = {
  "artificial-intelligence": "ai-assistants",
  "machine-learning": "ai-assistants",
  "chatbots": "ai-assistants",
  "design-tools": "design",
  "user-experience": "design",
  "prototyping": "design",
  "developer-tools": "development",
  "open-source": "development",
  "github": "development",
  "productivity": "productivity",
  "task-management": "productivity",
  "time-tracking": "productivity",
  "marketing": "seo-marketing",
  "seo": "seo-marketing",
  "email-marketing": "seo-marketing",
  "social-media-marketing": "seo-marketing",
  "analytics": "data-analytics",
  "data-visualization": "data-analytics",
  "web-hosting": "deploy-hosting",
  "saas": "deploy-hosting",
  "devops": "deploy-hosting",
  "security": "security-privacy",
  "privacy": "security-privacy",
  "crypto": "security-privacy",
  "media-tools": "image-media",
  "photo-editing": "image-media",
  "video": "video-audio",
  "podcasting": "video-audio",
  "audio": "video-audio",
  "writing-tools": "writing-notes",
  "note-taking": "writing-notes",
  "api": "api-integration",
  "no-code": "api-integration",
  "automation": "api-integration",
};
