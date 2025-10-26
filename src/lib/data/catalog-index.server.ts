import "server-only";
import { normalizeSlug } from "@/lib/utils/slug";
import { loadCatalogFromCSV, type ProductLite } from "./catalog-loader.server";

export type { ProductLite };

function loadIndex(): ProductLite[] {
  return loadCatalogFromCSV();
}

export function getAll(): ProductLite[] {
  return loadIndex();
}

export function findBySectionSlug(section: string, slug: string): ProductLite | null {
  const s = normalizeSlug(section);
  const g = normalizeSlug(slug);
  return getAll().find(p => p.section === s && p.slug === g) ?? null;
}

export function findByTitleTokens(q: string, minTokens = 2): ProductLite[] {
  const n = normalizeSlug(q);
  const tokens = n.split("-").filter(Boolean);
  if (tokens.length === 0) return [];
  const items = getAll();
  return items.filter(p => {
    const t = normalizeSlug(p.title);
    let hit = 0;
    for (const tok of tokens) if (t.includes(tok)) hit++;
    return hit >= Math.min(minTokens, tokens.length);
  });
}

export function findBySlugAnySection(slug: string): ProductLite | null {
  const normalizedSlug = normalizeSlug(slug);
  return getAll().find(p => p.slug === normalizedSlug) ?? null;
}