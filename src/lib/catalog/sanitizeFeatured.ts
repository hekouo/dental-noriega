// src/lib/catalog/sanitizeFeatured.ts
export type SanitizedFeaturedItem = {
  canonicalUrl: string;
  title: string;
  price?: number;
  imageUrl?: string;
  inStock: boolean;
  badge?: "Sugerido" | "Buscar";
};

async function resolveSlug(slug: string) {
  const res = await fetch(
    `/api/catalog/resolve?slug=${encodeURIComponent(slug)}`,
    { cache: "no-store" },
  );
  return res.json();
}

export async function sanitizeFeatured(
  slugs: string[],
): Promise<SanitizedFeaturedItem[]> {
  const out: SanitizedFeaturedItem[] = [];
  for (const slug of slugs) {
    try {
      const r = await resolveSlug(slug);
      if (r?.ok === true) {
        if (r.redirectTo) {
          out.push({
            canonicalUrl: r.redirectTo,
            title: r.product?.title ?? slug,
            price: r.product?.price,
            imageUrl: r.product?.imageUrl,
            inStock: (r.product?.inStock ?? true) !== false,
          });
          continue;
        }
        const p = r.product ?? r.suggestions?.[0];
        if (p) {
          out.push({
            canonicalUrl: `/catalogo/${p.section}/${p.slug}`,
            title: p.title ?? slug,
            price: p.price,
            imageUrl: p.imageUrl,
            inStock: (p.inStock ?? true) !== false,
            badge: r.product ? undefined : "Sugerido",
          });
          continue;
        }
      }
      out.push({
        canonicalUrl: `/catalogo?query=${encodeURIComponent(slug)}`,
        title: slug,
        inStock: true,
        badge: "Buscar",
      });
    } catch {
      out.push({
        canonicalUrl: `/catalogo?query=${encodeURIComponent(slug)}`,
        title: slug,
        inStock: true,
        badge: "Buscar",
      });
    }
  }
  return out;
}
