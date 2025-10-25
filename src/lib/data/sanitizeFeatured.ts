import "server-only";
import { loadFeatured, type FeaturedItem } from "./loadFeatured";

// Función para resolver usando el índice directo (server-side)
async function resolveProductDirect(slug: string) {
  try {
    const { findFuzzy } = await import("@/lib/data/catalog-index.server");
    return await findFuzzy(slug);
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(`[SanitizeFeatured] Direct resolve failed for ${slug}:`, error);
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
    const resolveResult = await resolveProductDirect(item.slug);

    if (resolveResult?.product) {
      return createResolvedItem(item, resolveResult.product);
    } else if (resolveResult?.suggestions?.length > 0) {
      return createSuggestionItem(item, resolveResult.suggestions[0]);
    } else {
      return createSearchFallbackItem(item);
    }
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(`[SanitizeFeatured] Error processing ${item.slug}:`, error);
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
