import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM "Tool" WHERE status = 'APPROVED' ORDER BY RANDOM() LIMIT 6`
  );
  if (rows.length === 0) return NextResponse.json([]);

  const tools = await prisma.tool.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { name: true } } } },
    },
  });

  return NextResponse.json(tools);
}
