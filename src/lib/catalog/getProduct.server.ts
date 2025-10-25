// src/lib/catalog/getProduct.server.ts
import "server-only";
import { getCatalogIndex } from "@/lib/data/catalog-index.server";

export type ProductLite = {
  section: string;
  slug: string;
  title: string;
  price: number;
  imageUrl?: string;
  inStock?: boolean;
  description?: string;
  sku?: string;
};

export async function getProductBySectionSlug(
  section: string,
  slug: string,
): Promise<ProductLite | null> {
  const idx = await getCatalogIndex();
  const bySection = idx.bySection.get(section as any);
  if (!bySection) return null;

  const catalogProduct = bySection.get(slug);
  if (!catalogProduct) return null;

  // Convertir CatalogProductLite a ProductLite
  return {
    section,
    slug: catalogProduct.slug,
    title: catalogProduct.title,
    price: catalogProduct.price,
    imageUrl: catalogProduct.image,
    inStock: true, // Default
    sku: catalogProduct.id,
  };
}
