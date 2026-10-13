"use client";

import { track } from "@vercel/analytics";

export function ToolWebsiteLink({ slug, className, children, destination = "website" }: { slug: string; className: string; children: React.ReactNode; destination?: "website" | "github" | "source" }) {
  return <a href={`/api/tools/${encodeURIComponent(slug)}/out${destination === "website" ? "" : `?destination=${destination}`}`} className={className} target={destination === "website" ? undefined : "_blank"} rel={destination === "website" ? undefined : "noopener noreferrer"} onClick={() => {
    track(destination === "website" ? "tool_website_click" : "tool_external_link_click", { tool: slug, source: "tool_detail", destination });
  }}>{children}</a>;
}
