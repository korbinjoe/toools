import { after, NextResponse } from "next/server";
import { toolMetricQuery } from "@/lib/tool-metrics";
import { prisma } from "@/lib/db";
import { getToolOutboundUrl } from "@/lib/tool-links";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const tool = await prisma.tool.findUnique({
    where: { slug, status: "APPROVED" },
    select: { id: true, url: true, github: true, sourceUrl: true, source: true },
  });

  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const destination = new URL(request.url).searchParams.get("destination") ?? "website";
  const url = getToolOutboundUrl(tool, destination);
  if (!url) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  after(() => prisma.$executeRaw(toolMetricQuery(tool.id, "click")).catch((error) => {
    console.error("Tool click counter failed", error);
  }));

  return NextResponse.redirect(url, 302);
}
