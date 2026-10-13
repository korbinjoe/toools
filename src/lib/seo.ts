import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./site";

export function siteUrl(path = "/") {
  return new URL(path, `${SITE_URL}/`).toString();
}

export function pageMetadata(title: string, description: string, path: string, options: { index?: boolean; image?: string } = {}): Metadata {
  const url = siteUrl(path);
  const images = [options.image || siteUrl("/opengraph-image")];
  return {
    title, description,
    alternates: { canonical: url },
    robots: { index: options.index !== false, follow: true },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url, siteName: SITE_NAME, locale: "en_US", type: "website", images },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images },
  };
}

export function serializeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function breadcrumbData(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: siteUrl(item.path) })),
  };
}

export type ToolsSearchParams = Record<string, string | string[] | undefined>;
export const TOOLS_PAGE_SIZE = 24;
const filterKeys = ["q", "category", "pricing", "platform", "openSource", "featured", "sort"] as const;
const pricingValues = ["FREE", "FREEMIUM", "PAID", "OPEN_SOURCE"];

export function toolsSearchPolicy(raw: ToolsSearchParams) {
  const params: Record<string, string> = {};
  for (const key of [...filterKeys, "page", "focus"]) {
    const value = raw[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first?.trim()) params[key] = first.trim();
  }
  const pageValue = params.page;
  const validPage = !pageValue || (/^[1-9]\d*$/.test(pageValue) && Number(pageValue) <= 1_000_000);
  const page = validPage && pageValue ? Number(pageValue) : 1;
  const index = validPage && !filterKeys.some((key) => Boolean(params[key])) && !Object.values(raw).some(Array.isArray);
  const query = new URLSearchParams();
  for (const key of filterKeys) if (params[key]) query.set(key, params[key]);
  if (page > 1) query.set("page", String(page));
  const path = `/tools${query.size ? `?${query}` : ""}`;
  // Arbitrary crawl URLs must not pass invalid enum values to Prisma.
  if (params.pricing && !pricingValues.includes(params.pricing)) delete params.pricing;
  return { params, page, index, path };
}

export function toolsPageHref(params: Record<string, string>, page: number) {
  return toolsSearchPolicy({ ...params, page: String(page), focus: undefined }).path;
}
