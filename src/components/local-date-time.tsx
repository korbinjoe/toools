"use client";

import { useSyncExternalStore } from "react";

function formatLocalDateTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

const emptySubscribe = () => () => {};

export function LocalDateTime({
  iso,
  prefix = "",
  className,
}: {
  iso: string;
  prefix?: string;
  className?: string;
}) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const formatted = isClient ? formatLocalDateTime(iso) : null;

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {prefix}
      {formatted}
    </time>
  );
}
