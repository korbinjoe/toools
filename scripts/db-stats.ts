import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const total = await prisma.tool.count();
  const approved = await prisma.tool.count({ where: { status: "APPROVED" } });
  const pending = await prisma.tool.count({ where: { status: "PENDING" } });

  const byCat = await prisma.category.findMany({
    include: { _count: { select: { tools: true } } },
    orderBy: { sortOrder: "asc" },
  });

  console.log(`\nTotal: ${total} | Approved: ${approved} | Pending: ${pending}\n`);
  console.log("By category:");
  for (const cat of byCat) {
    console.log(`  ${cat.name.padEnd(20)} ${cat._count.tools}`);
  }

  await prisma.$disconnect();
}

main();
