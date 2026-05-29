"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolCard } from "./tool-card";
import type { ToolItem } from "./tool-grid";

const INTERVAL_MS = 10_000;

export function FeaturedSection({
  initialTools,
}: {
  initialTools: ToolItem[];
}) {
  const [tools, setTools] = useState(initialTools);
  const [fading, setFading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const pausedRef = useRef(false);

  const refresh = useCallback(async () => {
    setSpinning(true);
    try {
      const res = await fetch("/api/featured");
      if (!res.ok) throw new Error("fetch failed");
      const data: ToolItem[] = await res.json();
      setFading(true);
      await new Promise((r) => setTimeout(r, 300));
      setTools(data);
      setFading(false);
    } catch {
      // keep current on error, no fade
    } finally {
      setTimeout(() => setSpinning(false), 500);
    }
  }, []);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) refresh();
    }, INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  return (
    <div
      onMouseEnter={() => (pausedRef.current = true)}
      onMouseLeave={() => (pausedRef.current = false)}
    >
      <div className="flex items-center gap-2 mb-8">
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight">Featured</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Discover something new every moment
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Refresh featured tools"
        >
          <RefreshCw
            className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
          />
        </button>
        <Link href="/tools">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" style={{ gridAutoRows: "1fr", minHeight: 368 }}>
        {fading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/80 bg-card p-5 space-y-3">
                <div className="flex items-start gap-3.5">
                  <div className="h-10 w-10 rounded-xl animate-shimmer shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 rounded animate-shimmer" />
                    <div className="h-3 w-16 rounded animate-shimmer" />
                  </div>
                </div>
                <div className="h-3 w-full rounded animate-shimmer" />
                <div className="h-3 w-2/3 rounded animate-shimmer" />
              </div>
            ))
          : tools.map((tool) => (
              <div key={tool.slug}>
                <ToolCard
                  slug={tool.slug}
                  name={tool.name}
                  tagline={tool.tagline}
                  url={tool.url}
                  iconUrl={tool.iconUrl}
                  category={tool.category}
                  tags={tool.tags.map((t) => ({ name: t.tag.name }))}
                  pricing={tool.pricing}
                />
              </div>
            ))}
      </div>
    </div>
  );
}
