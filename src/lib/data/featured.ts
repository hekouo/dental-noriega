// src/lib/data/featured.ts
// Función para obtener productos destacados con su sectionSlug

import { loadAllSections } from "./catalog-sections";
import type { Product } from "@/lib/utils/catalog";

export type FeaturedProduct = {
  sectionSlug: string;
  sectionName: string;
  item: Product;
};

export async function getFeaturedProducts(
  limit: number = 8,
): Promise<FeaturedProduct[]> {
  const sections = await loadAllSections();
  const featured: FeaturedProduct[] = [];

  // Estrategia: tomar productos de diferentes secciones
  for (const section of sections) {
    // Tomar hasta 2 productos por sección
    const itemsToTake = section.items.slice(0, 2);

    for (const item of itemsToTake) {
      featured.push({
        sectionSlug: section.sectionSlug,
        sectionName: section.sectionName,
        item,
      });

      // Detener si alcanzamos el límite
      if (featured.length >= limit) {
        return featured;
      }
    }
  }

  return featured;
}
