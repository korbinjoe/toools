"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmbedMode } from "@prisma/client";

interface ToolEmbedProps {
  name: string;
  url: string;
  embedMode: EmbedMode;
  embedUrl?: string | null;
  embedConfig?: {
    height?: string;
    sandbox?: string;
    allow?: string;
  } | null;
}

export function ToolEmbed({
  name,
  url,
  embedMode,
  embedUrl,
  embedConfig,
}: ToolEmbedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (embedMode === "EXTERNAL" || hasError) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 bg-stone-50 p-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white border border-border text-foreground font-bold text-3xl shadow-sm">
          {name[0]}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-sm leading-relaxed">
            {hasError
              ? "This tool doesn't allow embedding. Visit their site directly."
              : "Open in a new tab to use this tool"}
          </p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <Button size="lg" className="gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 active:translate-y-px">
            Visit {name}
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </a>
      </div>
    );
  }

  const src = embedUrl || url;
  const height = embedConfig?.height || "calc(100vh - 12rem)";
  const sandbox =
    embedConfig?.sandbox ||
    "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox";
  const allow = embedConfig?.allow || "clipboard-write; clipboard-read";

  return (
    <div
      className={
        isFullscreen
          ? "fixed inset-0 z-50 bg-background flex flex-col"
          : "relative flex flex-col"
      }
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2 bg-stone-50">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-foreground">
              Open <ExternalLink className="h-3 w-3" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
      <div className="relative flex-1" style={{ minHeight: isFullscreen ? 0 : height }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-50">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 rounded-lg animate-shimmer" />
              <span className="text-xs text-muted-foreground">Loading {name}...</span>
            </div>
          </div>
        )}
        <iframe
          src={src}
          sandbox={sandbox}
          allow={allow}
          className="h-full w-full border-0"
          style={{ minHeight: isFullscreen ? "100%" : height }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          title={name}
        />
      </div>
    </div>
  );
}
