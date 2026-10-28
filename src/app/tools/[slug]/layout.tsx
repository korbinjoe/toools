import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { loadApprovedTool } from "@/lib/tools";

export default async function ToolLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const loaded = await loadApprovedTool(slug);
  // Guard outside loading.tsx: a skeleton must not send a 200 before a missing record is known.
  // An unreachable catalog is not a known miss; the page renders static-safe content instead.
  if (loaded.status === "missing") notFound();
  return <>{children}</>;
}
