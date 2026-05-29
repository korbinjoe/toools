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

export function ToolAvatar({ name, url, iconUrl, className = "" }: ToolAvatarProps) {
  const hasReliableIcon = isReliableIconUrl(iconUrl);
  const domain = getDomain(url);
  const skipGoogle = shouldSkipGoogleFavicon(domain);
  const [stage, setStage] = useState<"primary" | "google" | "letter">(
    hasReliableIcon ? "primary" : skipGoogle ? "letter" : "google"
  );

  if (stage === "letter") {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-muted text-muted-foreground font-semibold text-base shrink-0 ${className}`}>
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
