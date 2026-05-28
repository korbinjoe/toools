"use server";

import { prisma } from "@/lib/db";
import type { Pricing } from "@prisma/client";

interface SubmitState {
  success: boolean;
  errors: Record<string, string>;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function submitTool(
  _prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;
  const tagline = formData.get("tagline") as string;
  const description = formData.get("description") as string;
  const categoryId = formData.get("categoryId") as string;
  const pricing = formData.get("pricing") as string;

  const errors: Record<string, string> = {};

  if (!name || name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }
  if (!url || !url.startsWith("http")) {
    errors.url = "Please enter a valid URL.";
  }
  if (!tagline || tagline.trim().length < 5) {
    errors.tagline = "Tagline must be at least 5 characters.";
  }
  if (!description || description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }
  if (!categoryId) {
    errors.categoryId = "Please select a category.";
  }
  if (!pricing || !["FREE", "FREEMIUM", "PAID", "OPEN_SOURCE"].includes(pricing)) {
    errors.pricing = "Please select a pricing model.";
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  // Generate a unique slug
  let slug = slugify(name);
  const existing = await prisma.tool.findUnique({ where: { slug } });
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  await prisma.tool.create({
    data: {
      name: name.trim(),
      slug,
      url: url.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      categoryId,
      pricing: pricing as Pricing,
      status: "PENDING",
    },
  });

  return { success: true, errors: {} };
}
