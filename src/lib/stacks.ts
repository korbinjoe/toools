import { prisma } from "@/lib/db";
import { stackPreviews, type StackPreview } from "@/lib/stacks-data";

export function getStackIconKey(slug: string): StackPreview["icon"] | null {
  return stackPreviews.find((s) => s.slug === slug)?.icon ?? null;
}

export const stackTags: Record<string, string[]> = {
  "indie-developer-toolkit": ["#indie-hacker", "#saas", "#solo-dev"],
};

export type StackListItem = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  stageCount: number;
  toolCount: number;
};

export type StackStageTool = {
  slug: string | null;
  name: string;
  tagline: string;
  pricing: string | null;
  githubStars: number | null;
  phVotes: number | null;
  iconUrl: string | null;
  url: string | null;
  initial: string;
  color: string;
};

export type StackDetail = {
  slug: string;
  name: string;
  description: string;
  stages: {
    id: string;
    name: string;
    description: string | null;
    editorNote: string | null;
    tools: StackStageTool[];
  }[];
};

function previewToListItem(stack: StackPreview): StackListItem {
  const toolCount = stack.stages.reduce((sum, s) => sum + s.tools.length, 0);
  return {
    slug: stack.slug,
    name: stack.name,
    tagline: stack.tagline,
    description: stack.description,
    stageCount: stack.stages.length,
    toolCount,
  };
}

function previewToDetail(stack: StackPreview): StackDetail {
  return {
    slug: stack.slug,
    name: stack.name,
    description: stack.description,
    stages: stack.stages.map((stage, idx) => ({
      id: `preview-${idx}`,
      name: stage.name,
      description: null,
      editorNote: null,
      tools: stage.tools.map((tool) => ({
        slug: null,
        name: tool.name,
        tagline: "",
        pricing: "FREEMIUM",
        githubStars: null,
        phVotes: null,
        iconUrl: null,
        url: null,
        initial: tool.initial,
        color: tool.color,
      })),
    })),
  };
}

export async function getStacksForList(): Promise<StackListItem[]> {
  try {
    const stacks = await prisma.stack.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        stages: {
          include: {
            recommendations: { select: { toolId: true } },
          },
        },
      },
    });

    if (stacks.length === 0) {
      return stackPreviews.map(previewToListItem);
    }

    return stacks.map((stack) => ({
      slug: stack.slug,
      name: stack.name,
      tagline: stack.tagline,
      description: stack.description,
      stageCount: stack.stages.length,
      toolCount: stack.stages.reduce((sum, s) => sum + s.recommendations.length, 0),
    }));
  } catch {
    return stackPreviews.map(previewToListItem);
  }
}

export async function getStackBySlug(slug: string): Promise<StackDetail | null> {
  const preview = stackPreviews.find((s) => s.slug === slug);

  try {
    const stack = await prisma.stack.findUnique({
      where: { slug },
      include: {
        stages: {
          orderBy: { sortOrder: "asc" },
          include: {
            recommendations: {
              orderBy: { sortOrder: "asc" },
              include: {
                tool: {
                  select: {
                    slug: true,
                    name: true,
                    tagline: true,
                    pricing: true,
                    githubStars: true,
                    phVotes: true,
                    iconUrl: true,
                    url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!stack) {
      return preview ? previewToDetail(preview) : null;
    }

    return {
      slug: stack.slug,
      name: stack.name,
      description: stack.description,
      stages: stack.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        description: stage.description,
        editorNote: stage.editorNote,
        tools: stage.recommendations.map((rec) => {
          const previewTool = preview?.stages
            .flatMap((s) => s.tools)
            .find((t) => t.name === rec.tool.name);

          return {
            slug: rec.tool.slug,
            name: rec.tool.name,
            tagline: rec.tool.tagline,
            pricing: rec.tool.pricing,
            githubStars: rec.tool.githubStars,
            phVotes: rec.tool.phVotes,
            iconUrl: rec.tool.iconUrl,
            url: rec.tool.url,
            initial: previewTool?.initial ?? rec.tool.name.charAt(0).toUpperCase(),
            color: previewTool?.color ?? "#78716C",
          };
        }),
      })),
    };
  } catch {
    return preview ? previewToDetail(preview) : null;
  }
}
