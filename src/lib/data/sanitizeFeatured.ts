import "server-only";
import { loadFeatured, type FeaturedItem } from "./loadFeatured";
// import { getCatalogIndex } from "./catalog-index.server";

// Función para resolver usando la API (server-side fetch)
async function resolveProductViaAPI(slug: string, section?: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";
    const url = section
      ? `${baseUrl}/api/catalog/resolve?section=${encodeURIComponent(section)}&slug=${encodeURIComponent(slug)}`
      : `${baseUrl}/api/catalog/resolve?slug=${encodeURIComponent(slug)}`;

    const response = await fetch(url, {
      cache: "force-cache",
      headers: { "User-Agent": "Server-Side-Resolve" },
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
    const resolveResult = await resolveProductViaAPI(item.slug);

    if (resolveResult?.ok) {
      return createResolvedItem(item, resolveResult);
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
  resolveResult: any,
): SanitizedFeaturedItem {
  const canonicalUrl =
    resolveResult.redirectTo ||
    `/catalogo/${resolveResult.section}/${resolveResult.slug}`;
  const inStock = resolveResult.product?.inStock !== false;

  return {
    ...item,
    resolved: true,
    canonicalUrl,
    inStock,
    sectionSlug: resolveResult.section,
    title: resolveResult.product?.title || item.title,
    price: resolveResult.product?.price || item.price,
    imageUrl: resolveResult.product?.imageUrl || item.image,
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
