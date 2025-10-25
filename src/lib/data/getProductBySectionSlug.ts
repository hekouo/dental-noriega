import "server-only";
import { getCatalogIndex } from "./catalog-index.server";
import type { ProductLite, SectionSlug } from "./catalog-index.server";

export async function getProductBySectionSlug(
  section: string,
  slug: string,
): Promise<ProductLite | null> {
  try {
    const index = await getCatalogIndex();
    const normalizedSection = section.toLowerCase().trim() as SectionSlug;
    const normalizedSlug = slug.toLowerCase().trim();

    const sectionMap = index.bySection.get(normalizedSection);
    if (!sectionMap) {
      return null;
    }

    return sectionMap.get(normalizedSlug) || null;
  } catch (error) {
    if (process.env.NEXT_PUBLIC_DEBUG === "1") {
      console.warn(
        `[getProductBySectionSlug] Error for ${section}/${slug}:`,
        error,
      );
    }
    return null;
  }
}
