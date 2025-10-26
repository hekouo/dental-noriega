import "server-only";
import { loadFeatured, type FeaturedItem } from "./loadFeatured";
import { normalizeSlug } from "@/lib/utils/slug";
import { findBySectionSlug, findByTitleTokens } from "./catalog-index.server";

// Overrides específicos para los 8 títulos reportados por el user
const OVERRIDES: Record<string, { section: string; slug: string }> = {
  "arco niti redondo 12 14 16 18 paquete con 10": { section: "ortodoncia-arcos-y-resortes", slug: "arco-niti-redondo-12-14-16-18-paquete-con-10" },
  "arco niti rectangular paquete con 10": { section: "ortodoncia-arcos-y-resortes", slug: "arco-niti-rectangular-paquete-con-10" },
  "bracket azdent malla 100 colado": { section: "ortodoncia-brackets-y-tubos", slug: "bracket-azdent-malla-100-colado" },
  "bracket ceramico roth azdent": { section: "ortodoncia-brackets-y-tubos", slug: "bracket-ceramico-roth-azdent" },
  "brackets carton mbt roth edgewise": { section: "ortodoncia-brackets-y-tubos", slug: "brackets-carton-mbt-roth-edgewise" },
  "braquet de autoligado con instrumento": { section: "ortodoncia-brackets-y-tubos", slug: "braquet-de-autoligado-con-instrumento" },
  "tubos con malla 1eros o 2o molar kit con 200 tubos": { section: "ortodoncia-brackets-y-tubos", slug: "tubos-con-malla-1eros-o-2o-molar-kit-con-200-tubos" },
  "pieza de alta con luz led 30 dias garantia": { section: "equipos", slug: "pieza-de-alta-con-luz-led-30-dias-garantia" },
};

// Función para resolver usando el índice directo (server-side)
async function resolveProductDirect(title: string) {
  try {
    // 1) Buscar por overrides específicos
    const normalizedTitle = normalizeSlug(title);
    const override = OVERRIDES[title] || OVERRIDES[normalizedTitle];
    if (override) {
      const product = findBySectionSlug(override.section, override.slug);
      if (product) {
        return { product, suggestions: [] };
      }
    }

    // 2) Buscar por tokens en el título
    const results = findByTitleTokens(title);
    if (results.length > 0) {
      return { product: results[0], suggestions: results.slice(1, 6) };
    }

    return { suggestions: [] };
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(`[SanitizeFeatured] Direct resolve failed for ${title}:`, error);
    }
    return { suggestions: [] };
  }
}

export type SanitizedFeaturedItem = FeaturedItem & {
  resolved: boolean;
  canonicalUrl?: string;
  inStock: boolean;
  imageUrl?: string;
  fallback?: {
    section: string;
    slug: string;
    title: string;
  };
};

export async function sanitizeFeatured(
  limit?: number,
): Promise<SanitizedFeaturedItem[]> {
  const featuredItems = await loadFeatured(limit);

  const sanitized: SanitizedFeaturedItem[] = [];

  for (const item of featuredItems) {
    const sanitizedItem = await processFeaturedItem(item);
    sanitized.push(sanitizedItem);
  }

  return sanitized;
}

async function processFeaturedItem(
  item: FeaturedItem,
): Promise<SanitizedFeaturedItem> {
  try {
    // 1) Si trae section/slug explícitos, buscar directo
    if (item.sectionSlug && item.slug) {
      const product = findBySectionSlug(item.sectionSlug, item.slug);
      if (product) {
        return createResolvedItem(item, product);
      }
    }

    // 2) Buscar por título usando la nueva función
    const resolveResult = await resolveProductDirect(item.title);

    if (resolveResult?.product) {
      return createResolvedItem(item, resolveResult.product);
    } else if (resolveResult?.suggestions?.length > 0) {
      return createSuggestionItem(item, resolveResult.suggestions[0]);
    } else {
      return createSearchFallbackItem(item);
    }
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(`[SanitizeFeatured] Error processing ${item.title}:`, error);
    }
    return createSearchFallbackItem(item);
  }
}

function createResolvedItem(
  item: FeaturedItem,
  product: any,
): SanitizedFeaturedItem {
  const canonicalUrl = `/catalogo/${product.section}/${product.slug}`;
  const inStock = product.inStock !== false;

  return {
    ...item,
    resolved: true,
    canonicalUrl,
    inStock,
    sectionSlug: product.section,
    title: product.title || item.title,
    price: product.price || item.price,
    imageUrl: product.imageUrl || item.image,
  };
}

function createSuggestionItem(
  item: FeaturedItem,
  best: any,
): SanitizedFeaturedItem {
  if (process.env.NEXT_PUBLIC_DEBUG === "1") {
    console.info(`[SanitizeFeatured] Using suggestion for ${item.slug}:`, {
      original: item.slug,
      suggested: `${best.section}/${best.slug}`,
      reason: "suggestion",
    });
  }

  return {
    ...item,
    resolved: false,
    canonicalUrl: `/catalogo/${best.section}/${best.slug}`,
    inStock: true,
    title: best.title || item.title,
    price: best.price || item.price,
    imageUrl: best.imageUrl || item.image,
    fallback: {
      section: best.section,
      slug: best.slug,
      title: best.title || item.title,
    },
  };
}

function createSearchFallbackItem(item: FeaturedItem): SanitizedFeaturedItem {
  if (process.env.NEXT_PUBLIC_DEBUG === "1") {
    console.info(`[SanitizeFeatured] Using search fallback for ${item.slug}:`, {
      original: item.slug,
      fallback: `/catalogo?query=${encodeURIComponent(item.slug)}`,
      reason: "no-alternatives",
    });
  }

  return {
    ...item,
    resolved: false,
    canonicalUrl: `/catalogo?query=${encodeURIComponent(item.slug)}`,
    inStock: true,
    fallback: {
      section: "búsqueda",
      slug: item.slug,
      title: item.title,
    },
  };
}
