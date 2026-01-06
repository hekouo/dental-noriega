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
    const { data, error } = await supabase
      .from("sections")
      .select("key, title, position")
      .order("position", { ascending: true, nullsFirst: false })
      .order("title", { ascending: true })
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
    return data.map((item) => ({
      slug: String(item.key ?? ""),
      name: String(item.title ?? item.key ?? ""),
    }));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSections] Error:", error);
    }
    // Fallback a vista
    return await getSectionsFromCatalogView();
  }
}

