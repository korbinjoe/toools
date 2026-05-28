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

function isReliableIconUrl(iconUrl: string | null | undefined): boolean {
  if (!iconUrl) return false;
  if (iconUrl.endsWith("/favicon.ico")) return false;
  return true;
}

export function ToolAvatar({ name, url, iconUrl, className = "" }: ToolAvatarProps) {
  const hasReliableIcon = isReliableIconUrl(iconUrl);
  const [stage, setStage] = useState<"primary" | "google" | "letter">(
    hasReliableIcon ? "primary" : "google"
  );
  const domain = getDomain(url);

  if (stage === "letter") {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-stone-100 text-stone-500 font-semibold text-base shrink-0 ${className}`}>
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
      className={`rounded-xl object-contain shrink-0 bg-white ${className}`}
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
