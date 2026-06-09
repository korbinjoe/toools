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

export type StackStage = {
  id: string;
  name: string;
  description: string | null;
  editorNote: string | null;
  tools: StackStageTool[];
  relatedTools: StackStageTool[];
  relatedLabel: string | null;
  relatedCategorySlug: string | null;
};

export type StackDetail = {
  slug: string;
  name: string;
  description: string;
  stages: StackStage[];
};

const RELATED_TOOLS_LIMIT = 6;

const toolSelect = {
  slug: true,
  name: true,
  tagline: true,
  pricing: true,
  githubStars: true,
  phVotes: true,
  iconUrl: true,
  url: true,
  categoryId: true,
  category: { select: { name: true, slug: true } },
} as const;

type ToolRow = {
  slug: string;
  name: string;
  tagline: string;
  pricing: string;
  githubStars: number | null;
  phVotes: number | null;
  iconUrl: string | null;
  url: string;
  categoryId: string;
  category: { name: string; slug: string };
};

function mapToolToStageTool(
  tool: ToolRow,
  preview?: StackPreview,
): StackStageTool {
  const previewTool = preview?.stages
    .flatMap((s) => s.tools)
    .find((t) => t.name === tool.name);

  return {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    pricing: tool.pricing,
    githubStars: tool.githubStars,
    phVotes: tool.phVotes,
    iconUrl: tool.iconUrl,
    url: tool.url,
    initial: previewTool?.initial ?? tool.name.charAt(0).toUpperCase(),
    color: previewTool?.color ?? "#78716C",
  };
}

function signalScore(tool: Pick<ToolRow, "githubStars" | "phVotes">) {
  return (tool.githubStars ?? 0) * 10 + (tool.phVotes ?? 0);
}

function relatedLabelForCategories(categories: { name: string; slug: string }[]) {
  const unique = [...new Map(categories.map((c) => [c.slug, c])).values()];
  if (unique.length === 1) return unique[0];
  return null;
}

function pickRelatedTools(
  stageTools: ToolRow[],
  candidates: ToolRow[],
  preview?: StackPreview,
): {
  tools: StackStageTool[];
  label: string | null;
  categorySlug: string | null;
} {
  const excludeSlugs = new Set(stageTools.map((t) => t.slug));
  const categoryIds = new Set(stageTools.map((t) => t.categoryId));
  const category = relatedLabelForCategories(stageTools.map((t) => t.category));

  const related = candidates
    .filter((t) => categoryIds.has(t.categoryId) && !excludeSlugs.has(t.slug))
    .sort((a, b) => signalScore(b) - signalScore(a))
    .slice(0, RELATED_TOOLS_LIMIT)
    .map((t) => mapToolToStageTool(t, preview));

  return {
    tools: related,
    label: category?.name ?? null,
    categorySlug: category?.slug ?? null,
  };
}

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
      relatedTools: [],
      relatedLabel: null,
      relatedCategorySlug: null,
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
                tool: { select: toolSelect },
              },
            },
          },
        },
      },
    });

    if (!stack) {
      return preview ? previewToDetail(preview) : null;
    }

    const stageToolRows = stack.stages.map((stage) =>
      stage.recommendations.map((rec) => rec.tool),
    );
    const recommendedSlugs = stageToolRows.flat().map((t) => t.slug);
    const categoryIds = [...new Set(stageToolRows.flat().map((t) => t.categoryId))];

    const relatedCandidates =
      categoryIds.length > 0
        ? await prisma.tool.findMany({
            where: {
              status: "APPROVED",
              categoryId: { in: categoryIds },
              slug: { notIn: recommendedSlugs },
            },
            select: toolSelect,
          })
        : [];

    return {
      slug: stack.slug,
      name: stack.name,
      description: stack.description,
      stages: stack.stages.map((stage, idx) => {
        const tools = stageToolRows[idx].map((t) => mapToolToStageTool(t, preview));
        const { tools: relatedTools, label: relatedLabel, categorySlug: relatedCategorySlug } =
          pickRelatedTools(stageToolRows[idx], relatedCandidates, preview);

        return {
          id: stage.id,
          name: stage.name,
          description: stage.description,
          editorNote: stage.editorNote,
          tools,
          relatedTools,
          relatedLabel,
          relatedCategorySlug,
        };
      }),
    };
  } catch {
    return preview ? previewToDetail(preview) : null;
  }
}
