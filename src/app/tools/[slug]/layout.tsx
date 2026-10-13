import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getApprovedTool } from "@/lib/tools";

export default async function ToolLayout({ children, params }: { children: ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Guard outside loading.tsx: a skeleton must not send a 200 before a missing record is known.
  if (!await getApprovedTool(slug)) notFound();
  return <>{children}</>;
}
