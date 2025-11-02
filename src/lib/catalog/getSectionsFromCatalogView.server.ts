// src/lib/catalog/getSectionsFromCatalogView.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server-auth";

export type SectionInfo = {
  slug: string;
  name: string;
};

/**
 * Obtiene secciones desde la vista api_catalog_with_images.
 * Útil como fallback cuando la tabla sections está vacía.
 */
export async function getSectionsFromCatalogView(): Promise<SectionInfo[]> {
  const supabase = createServerSupabase();

  try {
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select("section")
      .not("section", "is", null)
      .neq("section", "");

    if (error) {
      console.warn("[getSectionsFromCatalogView] Error:", error.message);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Obtener secciones únicas y ordenadas
    const uniqueSections = [
      ...new Set(
        (data as Array<{ section: string }>)
          .map((item) => String(item.section).trim())
          .filter((s) => s.length > 0),
      ),
    ].sort();

    // Convertir slugs a nombres (title-case, reemplazando - por espacio)
    return uniqueSections.map((slug) => ({
      slug,
      name: slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
    }));
  } catch (error) {
    console.warn("[getSectionsFromCatalogView] Error:", error);
    return [];
  }
}

