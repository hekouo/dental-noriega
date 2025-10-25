// src/lib/catalog/getProduct.server.ts
import "server-only";

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

let _catalogIndex: Map<string, Map<string, ProductLite>> | null = null;

async function loadCatalogIndex(): Promise<
  Map<string, Map<string, ProductLite>>
> {
  if (_catalogIndex) return _catalogIndex;
  // TODO: Reemplazar por lectura real (memoria/CSV/DB) que devuelva Map<section, Map<slug, ProductLite>>
  _catalogIndex = new Map();
  return _catalogIndex;
}

export async function getProductBySectionSlug(section: string, slug: string) {
  const idx = await loadCatalogIndex();
  const bySection = idx.get(section);
  if (!bySection) return null;
  return bySection.get(slug) ?? null;
}
