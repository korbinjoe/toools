import { cache } from "react";
import { prisma } from "./db";

// Share the approved record across the layout, metadata, and detail render.
export const getApprovedTool = cache(async (slug: string) =>
  prisma.tool.findFirst({
    where: { slug, status: "APPROVED" },
    include: {
      category: true,
      tags: { include: { tag: true } },
      stageRecommendations: {
        include: {
          stage: {
            include: { stack: { select: { name: true, slug: true } } },
          },
        },
      },
    },
  }),
);
