import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const tool = await prisma.tool.findUnique({
    where: { slug, status: "APPROVED" },
    select: { id: true, url: true },
  });

  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  prisma.tool
    .update({ where: { id: tool.id }, data: { clickCount: { increment: 1 } } })
    .catch(() => {});

  return NextResponse.redirect(tool.url, 302);
}
