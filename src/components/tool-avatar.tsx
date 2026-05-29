"use client";

import { useState } from "react";

interface ToolAvatarProps {
  name: string;
  url: string;
  iconUrl?: string | null;
  className?: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function getGoogleFaviconUrl(domain: string, size: number = 64): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

const SKIP_FAVICON_DOMAINS = ["producthunt.com", "www.producthunt.com"];

function isReliableIconUrl(iconUrl: string | null | undefined): boolean {
  if (!iconUrl) return false;
  if (iconUrl.endsWith("/favicon.ico")) return false;
  return true;
}

function shouldSkipGoogleFavicon(domain: string): boolean {
  return SKIP_FAVICON_DOMAINS.includes(domain);
}

const avatarColors = [
  { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-sky-100 dark:bg-sky-900/40", text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300" },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function ToolAvatar({ name, url, iconUrl, className = "" }: ToolAvatarProps) {
  const hasReliableIcon = isReliableIconUrl(iconUrl);
  const domain = getDomain(url);
  const skipGoogle = shouldSkipGoogleFavicon(domain);
  const [stage, setStage] = useState<"primary" | "google" | "letter">(
    hasReliableIcon ? "primary" : skipGoogle ? "letter" : "google"
  );

  if (stage === "letter") {
    const color = avatarColors[hashName(name) % avatarColors.length];
    return (
      <div className={`flex items-center justify-center rounded-xl ${color.bg} ${color.text} font-semibold text-base shrink-0 ${className}`}>
        {name[0]}
      </div>
    );
  }

  const src = stage === "primary" && iconUrl
    ? iconUrl
    : getGoogleFaviconUrl(domain);

  return (
    <img
      src={src}
      alt=""
      className={`rounded-xl object-contain shrink-0 bg-card ${className}`}
      onError={() => {
        if (stage === "primary") {
          setStage("google");
        } else {
          setStage("letter");
        }
      }}
    />
  );
}
