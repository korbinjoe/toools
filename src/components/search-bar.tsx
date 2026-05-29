"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

export function SearchBar({
  defaultValue = "",
  placeholder = "Search tools...",
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(defaultValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const navigate = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set("q", term);
      } else {
        params.delete("q");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/tools?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  const handleSearch = useCallback(
    (term: string) => {
      setValue(term);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => navigate(term), 300);
    },
    [navigate],
  );

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-sm outline-none transition-all duration-200 placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
        value={value}
        onChange={(e) => handleSearch(e.target.value)}
        data-pending={isPending ? "" : undefined}
      />
    </div>
  );
}
