import { Prisma } from "@prisma/client";

// Atomic counters must not invoke Prisma's @updatedAt content timestamp behavior.
export function toolMetricQuery(id: string, metric: "view" | "click") {
  return metric === "view"
    ? Prisma.sql`UPDATE "Tool" SET "viewCount" = "viewCount" + 1 WHERE "id" = ${id}`
    : Prisma.sql`UPDATE "Tool" SET "clickCount" = "clickCount" + 1 WHERE "id" = ${id}`;
}
