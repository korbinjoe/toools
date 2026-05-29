"use client";

import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolAvatar } from "@/components/tool-avatar";

interface ToolEmbedProps {
  name: string;
  url: string;
  iconUrl?: string | null;
  screenshotUrl?: string | null;
}

export function ToolEmbed({
  name,
  url,
  iconUrl,
  screenshotUrl,
}: ToolEmbedProps) {
  if (screenshotUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block overflow-hidden"
      >
        <img
          src={screenshotUrl}
          alt={`${name} screenshot`}
          className="w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]"
          style={{ maxHeight: "32rem" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 rounded-xl bg-background/95 px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg backdrop-blur-sm">
            Visit {name}
            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 bg-muted/50 p-16 text-center">
      <ToolAvatar
        name={name}
        url={url}
        iconUrl={iconUrl}
        className="h-20 w-20 rounded-2xl shadow-sm"
      />
      <div>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
          Open in a new tab to use this tool
        </p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button
          size="lg"
          className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:translate-y-px"
        >
          Visit {name}
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </a>
    </div>
  );
}
