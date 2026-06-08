import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { unstable_noStore as noStore } from "next/cache";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getDataUpdatedAt() {
  noStore();
  const result = await prisma.tool.aggregate({
    where: { status: "APPROVED" },
    _max: { updatedAt: true },
  });
  return result._max.updatedAt;
}
