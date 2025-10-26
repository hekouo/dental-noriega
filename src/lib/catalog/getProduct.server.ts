import "server-only";
import { findBySectionSlug, findByTitleTokens, findBySlugAnySection } from "@/lib/data/catalog-index.server";

export async function getProductBySectionSlug(section: string, slug: string) {
  return findBySectionSlug(section, slug);
}

export async function resolveFallback(slugOrTitle: string) {
  const list = findByTitleTokens(slugOrTitle);
  return { product: list[0] ?? null, suggestions: list.slice(1, 6) };
}

export async function getProductBySlugAnySection(slug: string) {
  return findBySlugAnySection(slug);
}