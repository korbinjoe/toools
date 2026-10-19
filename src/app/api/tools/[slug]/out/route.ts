import { after, connection, NextResponse } from "next/server";
import { recordToolMetric } from "@/lib/record-tool-metric";
import { getApprovedToolLink } from "@/lib/tools";
import { getToolOutboundUrl } from "@/lib/tool-links";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  await connection();
  const { slug } = await params;
  const tool = await getApprovedToolLink(slug);

  if (!tool) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const destination = new URL(request.url).searchParams.get("destination") ?? "website";
  const url = getToolOutboundUrl(tool, destination);
  if (!url) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  after(() => recordToolMetric(tool.id, "click"));

  return NextResponse.redirect(url, 302);
}
