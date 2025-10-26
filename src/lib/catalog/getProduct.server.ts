// src/lib/catalog/getProduct.server.ts
import "server-only";
import { findBySectionSlug, findByTitleTokens, type ProductLite } from "@/lib/data/catalog-index.server";

export type { ProductLite };

export async function getProductBySectionSlug(section: string, slug: string): Promise<ProductLite | null> {
  return findBySectionSlug(section, slug);
}

export async function resolveFallback(slugOrTitle: string): Promise<{ product?: ProductLite; suggestions: ProductLite[] }> {
  const list = findByTitleTokens(slugOrTitle);
  return { product: list[0], suggestions: list.slice(1, 6) };
}