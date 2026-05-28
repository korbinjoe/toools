"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCallback, useTransition } from "react";

interface FilterPanelProps {
  categories: { slug: string; name: string }[];
}

const pricingOptions = [
  { value: "FREE", label: "Free" },
  { value: "OPEN_SOURCE", label: "Open Source" },
  { value: "FREEMIUM", label: "Freemium" },
  { value: "PAID", label: "Paid" },
];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 min-h-[32px] active:scale-[0.97]",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
      )}
    >
      {label}
    </button>
  );
}

export function FilterPanel({ categories }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const currentCategory = searchParams.get("category") || "";
  const currentPricing = searchParams.get("pricing") || "";
  const setFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && params.get(key) !== value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/tools?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">
          Category
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <Chip
              key={cat.slug}
              label={cat.name}
              active={currentCategory === cat.slug}
              onClick={() => setFilter("category", cat.slug)}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-2.5">
          Pricing
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {pricingOptions.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={currentPricing === opt.value}
              onClick={() => setFilter("pricing", opt.value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
