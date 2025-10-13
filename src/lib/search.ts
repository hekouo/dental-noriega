// src/lib/search.ts
import { loadAllSections } from "@/lib/data/catalog-sections";
import { normalizeText } from "@/lib/utils/text";

export type SearchItem = {
  sectionSlug: string;
  sectionName: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  image: string;
  imageResolved?: string;
};

export async function searchProducts(q: string): Promise<SearchItem[]> {
  const needle = normalizeText(q);
  if (!needle) return [];
  
  const secs = await loadAllSections();
  const out: SearchItem[] = [];

  for (const s of secs) {
    for (const it of s.items) {
      const hay = normalizeText([it.title, it.description, s.sectionName].join(" "));
      if (hay.includes(needle)) {
        out.push({
          sectionSlug: s.sectionSlug,
          sectionName: s.sectionName,
          slug: it.slug,
          title: it.title,
          description: it.description,
          price: it.price,
          image: it.image,
          imageResolved: it.imageResolved,
        });
      }
    }
  }
  
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

