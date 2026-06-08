const PLATFORM_MAP: Record<string, string> = {
  web: "Web",
  mac: "Mac",
  macos: "Mac",
  osx: "Mac",
  windows: "Windows",
  win: "Windows",
  linux: "Linux",
  ios: "iOS",
  iphone: "iOS",
  ipad: "iOS",
  android: "Android",
};

export function normalizePlatform(platform: string): string | null {
  const key = platform.trim().toLowerCase();
  return PLATFORM_MAP[key] ?? null;
}

export function normalizePlatforms(platforms: string[]): string[] {
  const seen = new Set<string>();
  for (const platform of platforms) {
    const normalized = normalizePlatform(platform);
    if (normalized) seen.add(normalized);
  }
  return [...seen];
}
