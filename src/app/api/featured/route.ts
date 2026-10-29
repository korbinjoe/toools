import { connection, NextResponse } from "next/server";
import { loadFeaturedTools } from "@/lib/tools";

export async function GET() {
  await connection();
  return NextResponse.json(await loadFeaturedTools());
}
