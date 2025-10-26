import "server-only";
import { loadFeatured, type FeaturedItem } from "./loadFeatured";
import { normalizeSlug } from "@/lib/utils/slug";
import { findBySectionSlug, findByTitleTokens } from "./catalog-index.server";

const OVERRIDES: Record<string, { section: string; slug: string }> = {
  "arco-niti-redondo-12-14-16-18-paquete-con-10": { section: "ortodoncia", slug: "arco-niti-redondo-12-14-16-18-paquete-con-10" },
  "arco-niti-rectangular-paquete-con-10":         { section: "ortodoncia", slug: "arco-niti-rectangular-paquete-con-10" },
  "bracket-azdent-malla-100-colado":              { section: "ortodoncia", slug: "bracket-azdent-malla-100-colado" },
  "bracket-ceramico-roth-azdent":                 { section: "ortodoncia", slug: "bracket-ceramico-roth-azdent" },
  "brackets-carton-mbt-roth-edgewise":            { section: "ortodoncia", slug: "brackets-carton-mbt-roth-edgewise" },
  "braquet-de-autoligado-con-instrumento":        { section: "ortodoncia", slug: "braquet-de-autoligado-con-instrumento" },
  "tubos-con-malla-1eros-o-2o-molar-kit-con-200-tubos": { section: "ortodoncia", slug: "tubos-con-malla-1eros-o-2o-molar-kit-con-200-tubos" },
  "pieza-de-alta-con-luz-led-30-dias-garantia":   { section: "equipo", slug: "pieza-de-alta-con-luz-led-30-dias-garantia" },
};

export type SanitizedFeaturedItem = FeaturedItem & {
  resolved: boolean;
  canonicalUrl?: string;
  inStock: boolean;
  searchFallback?: string;
};

export async function sanitizeFeatured(): Promise<SanitizedFeaturedItem[]> {
  const items = await loadFeatured();
  const sanitized: SanitizedFeaturedItem[] = [];

  for (const item of items) {
    const key = normalizeSlug(item.title ?? item.slug ?? "");
    let canonicalUrl: string | undefined;

    // 1) Override explícito
    if (OVERRIDES[key]) {
      const { section, slug } = OVERRIDES[key];
      const p = findBySectionSlug(section, slug);
      if (p) canonicalUrl = `/catalogo/${p.section}/${p.slug}`;
    }

    // 2) Búsqueda por tokens si no hubo override
    if (!canonicalUrl && item.title) {
      const list = findByTitleTokens(item.title);
      if (list[0]) canonicalUrl = `/catalogo/${list[0].section}/${list[0].slug}`;
    }

    // 3) Asignar en el objeto resultante
    sanitized.push({
      ...item,
      resolved: !!canonicalUrl,
      canonicalUrl,
      inStock: true,
      searchFallback: canonicalUrl ? undefined : `/catalogo?query=${encodeURIComponent(key)}`,
    });
  }

  return sanitized;
}