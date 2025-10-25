import "server-only";
import { loadFeatured, type FeaturedItem } from "./loadFeatured";
import { getCatalogIndex, findExact } from "./catalog-index.server";

export type SanitizedFeaturedItem = FeaturedItem & {
  resolved: boolean;
  canonicalUrl?: string;
  inStock: boolean;
  fallback?: {
    section: string;
    slug: string;
    title: string;
  };
};

export async function sanitizeFeatured(limit?: number): Promise<SanitizedFeaturedItem[]> {
  const featuredItems = await loadFeatured(limit);
  const index = await getCatalogIndex();
  
  const sanitized: SanitizedFeaturedItem[] = [];
  
  for (const item of featuredItems) {
    try {
      // Intentar resolver el producto
      const resolved = await findExact(item.sectionSlug as any, item.slug);
      
      if (resolved) {
        // Producto encontrado - inStock por defecto true
        const inStock = true; // Por defecto disponible
        sanitized.push({
          ...item,
          resolved: true,
          canonicalUrl: `/catalogo/${item.sectionSlug}/${item.slug}`,
          inStock
        });
      } else {
        // Producto no encontrado, buscar alternativas
        const alternatives = await findAlternatives(item, index);
        
        if (alternatives.length > 0) {
          // Usar la mejor alternativa - por defecto disponible
          const best = alternatives[0];
          sanitized.push({
            ...item,
            resolved: false,
            canonicalUrl: `/catalogo/${best.section}/${best.slug}`,
            inStock: true, // Alternativas también disponibles por defecto
            fallback: {
              section: best.section,
              slug: best.slug,
              title: best.title
            }
          });
        } else {
          // No hay alternativas, marcar como sin stock (solo en este caso)
          sanitized.push({
            ...item,
            resolved: false,
            inStock: false // Solo aquí se marca como agotado
          });
        }
      }
    } catch (error) {
      console.warn(`[SanitizeFeatured] Error processing ${item.slug}:`, error);
      // En caso de error, asumir disponible por defecto
      sanitized.push({
        ...item,
        resolved: false,
        inStock: true // Por defecto disponible incluso con error
      });
    }
  }
  
  return sanitized;
}

async function findAlternatives(item: FeaturedItem, index: any) {
  const alternatives: Array<{ section: string; slug: string; title: string; score: number }> = [];
  
  // Buscar productos similares por título
  const searchTerms = item.title.toLowerCase().split(' ');
  
  for (const [section, sectionMap] of index.bySection) {
    for (const [slug, product] of sectionMap) {
      const productTitle = product.title.toLowerCase();
      let score = 0;
      
      // Calcular score basado en palabras comunes
      for (const term of searchTerms) {
        if (productTitle.includes(term)) {
          score += 1;
        }
      }
      
      // Normalizar score
      score = score / Math.max(searchTerms.length, productTitle.split(' ').length);
      
      if (score > 0.3) { // Umbral mínimo de similitud
        alternatives.push({
          section,
          slug,
          title: product.title,
          score
        });
      }
    }
  }
  
  // Ordenar por score descendente
  return alternatives.sort((a, b) => b.score - a.score).slice(0, 3);
}
