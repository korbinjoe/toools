import { Eye, MousePointerClick } from "lucide-react";

const countFormatter = new Intl.NumberFormat("en");

export function ToolEngagement({
  viewCount,
  clickCount,
  className = "",
}: {
  viewCount: number | null;
  clickCount: number | null;
  className?: string;
}) {
  return (
    <div
      data-tool-engagement=""
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground ${className}`}
    >
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap"
        title={viewCount == null ? "Tool detail views unavailable" : `${countFormatter.format(viewCount)} tool detail views`}
      >
        <Eye className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="tabular-nums">{viewCount == null ? "—" : countFormatter.format(viewCount)}</span>
        <span>views</span>
      </span>
      <span
        className="inline-flex items-center gap-1 whitespace-nowrap"
        title={clickCount == null ? "Outbound clicks unavailable" : `${countFormatter.format(clickCount)} outbound clicks`}
      >
        <MousePointerClick className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="tabular-nums">{clickCount == null ? "—" : countFormatter.format(clickCount)}</span>
        <span>clicks</span>
      </span>
    </div>
  );
}
