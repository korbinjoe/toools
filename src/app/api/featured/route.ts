import { connection, NextResponse } from "next/server";
import { getRandomApprovedTools } from "@/lib/tools";

export async function GET() {
  await connection();
  return NextResponse.json(await getRandomApprovedTools());
}
