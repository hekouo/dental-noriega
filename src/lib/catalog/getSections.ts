import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSectionsFromCatalogView } from "./getSectionsFromCatalogView.server";

export type SectionInfo = {
  slug: string;
  name: string;
};

/**
 * Obtiene secciones desde la tabla public.sections.
 * Orden: position si existe, luego alfabético por name.
 * Limita a 12 secciones máximo.
 * 
 * Fallback: si la tabla está vacía, usa getSectionsFromCatalogView.
 */
export async function getSections(limit = 12): Promise<SectionInfo[]> {
  const supabase = createServerSupabase();

  try {
    // Intentar obtener desde public.sections
    // Manejar ambos schemas: (key/title) o (slug/name)
    const { data, error } = await supabase
      .from("sections")
      .select("key, slug, title, name, position")
      .order("position", { ascending: true, nullsFirst: false })
      .limit(limit);

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getSections] Error from sections table:", error.message);
      }
      // Fallback a vista
      return await getSectionsFromCatalogView();
    }

    if (!data || data.length === 0) {
      // Fallback a vista si la tabla está vacía
      return await getSectionsFromCatalogView();
    }

    // Mapear a SectionInfo
    // Priorizar: name > title, slug > key
    return data
      .map((item) => {
        const slug = String(item.slug ?? item.key ?? "");
        const name = String(item.name ?? item.title ?? slug);
        return { slug, name };
      })
      .filter((item) => item.slug.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name)); // Orden alfabético por name
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSections] Error:", error);
    }
    // Fallback a vista
    return await getSectionsFromCatalogView();
  }
}

