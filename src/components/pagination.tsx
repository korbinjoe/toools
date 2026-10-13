import Link from "next/link";
import { toolsPageHref } from "@/lib/seo";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="flex items-center justify-center gap-1 pt-8"
      aria-label="Pagination"
    >
      {currentPage > 1 ? <Link
        href={toolsPageHref(searchParams, currentPage - 1)}
        prefetch={false}
        aria-label="Previous page"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link> : <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center opacity-30"><ChevronLeft className="h-4 w-4" /></span>}

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="inline-flex h-9 w-9 items-center justify-center text-xs text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={toolsPageHref(searchParams, p)}
            prefetch={false}
            aria-label={`Page ${p}`}
            aria-current={p === currentPage ? "page" : undefined}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              p === currentPage
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {p}
          </Link>
        ),
      )}

      {currentPage < totalPages ? <Link
        href={toolsPageHref(searchParams, currentPage + 1)}
        prefetch={false}
        aria-label="Next page"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </Link> : <span aria-hidden="true" className="inline-flex h-9 w-9 items-center justify-center opacity-30"><ChevronRight className="h-4 w-4" /></span>}
    </nav>
  );
}

function getPageNumbers(
  current: number,
  total: number,
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");

  pages.push(total);
  return pages;
}
