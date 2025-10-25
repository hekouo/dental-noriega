import "server-only";
import { loadFeatured, type FeaturedItem } from "./loadFeatured";
import { getCatalogIndex, findExact, findCross } from "./catalog-index.server";

// Función para resolver usando la API (server-side fetch)
async function resolveProductViaAPI(slug: string, section?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3002';
    const url = section 
      ? `${baseUrl}/api/catalog/resolve?section=${encodeURIComponent(section)}&slug=${encodeURIComponent(slug)}`
      : `${baseUrl}/api/catalog/resolve?slug=${encodeURIComponent(slug)}`;
    
    const response = await fetch(url, { 
      cache: 'force-cache',
      headers: { 'User-Agent': 'Server-Side-Resolve' }
    });
    
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(`[SanitizeFeatured] API resolve failed for ${slug}:`, error);
    }
    return null;
  }
}

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
      // Resolver usando la API (sin sección específica para destacados)
      const resolveResult = await resolveProductViaAPI(item.slug);
      
      if (resolveResult?.ok) {
        // Producto encontrado - usar URL canónica si existe
        const canonicalUrl = resolveResult.redirectTo || `/catalogo/${resolveResult.section}/${resolveResult.slug}`;
        const inStock = resolveResult.product?.inStock !== false; // Por defecto true
        
        sanitized.push({
          ...item,
          resolved: true,
          canonicalUrl,
          inStock,
          sectionSlug: resolveResult.section // Actualizar sección real
        });
      } else if (resolveResult?.suggestions?.length > 0) {
        // Usar la mejor sugerencia
        const best = resolveResult.suggestions[0];
        const inStock = true; // Sugerencias disponibles por defecto
        
        sanitized.push({
          ...item,
          resolved: false,
          canonicalUrl: `/catalogo/${best.section}/${best.slug}`,
          inStock,
          fallback: {
            section: best.section,
            slug: best.slug,
            title: best.title || item.title
          }
        });
      } else {
        // No hay alternativas, excluir del grid
        if (process.env.NEXT_PUBLIC_DEBUG === "1") {
          console.warn(`[SanitizeFeatured] No alternatives found for ${item.slug}, excluding from grid`);
        }
        continue; // Saltar este item
      }
    } catch (error) {
      if (process.env.NEXT_PUBLIC_DEBUG === "1") {
        console.warn(`[SanitizeFeatured] Error processing ${item.slug}:`, error);
      }
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
