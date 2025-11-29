import "server-only";
import { createClient } from "@/lib/supabase/public";

/**
 * Obtiene secciones que tienen al menos un producto activo
 * Solo secciones con productos activos aparecen en el catálogo público
 */
export async function getSectionsWithActiveProducts(): Promise<
  Array<{ id: string; slug: string; name: string }>
> {
  const sb = createClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSectionsWithActiveProducts] missing supabase envs");
    }
    return [];
  }

  try {
    // Obtener secciones únicas que tienen productos activos
    // Usamos una subquery para filtrar solo secciones con productos activos
    const { data, error } = await sb
      .from("products")
      .select("section_id, sections!inner(id, slug, name)")
      .eq("active", true)
      .not("section_id", "is", null);

    if (error) {
      console.error("[getSectionsWithActiveProducts] Error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Obtener secciones únicas
    const sectionsMap = new Map<string, { id: string; slug: string; name: string }>();
    for (const item of data) {
      const section = item.sections;
      if (section && typeof section === "object" && "id" in section) {
        // Type assertion seguro
        const sectionData = section as unknown as {
          id: string;
          slug: string | null;
          name: string | null;
        };
        if (sectionData.id && !sectionsMap.has(sectionData.id)) {
          sectionsMap.set(sectionData.id, {
            id: sectionData.id,
            slug: sectionData.slug || "",
            name: sectionData.name || sectionData.slug || "",
          });
        }
      }
    }

    // Ordenar por nombre
    return Array.from(sectionsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } catch (error) {
    console.error("[getSectionsWithActiveProducts] Error:", error);
    return [];
  }
}

/**
 * Verifica si una sección existe por su slug
 */
export async function getSectionBySlug(
  slug: string,
): Promise<{ id: string; slug: string; name: string } | null> {
  const sb = createClient();
  if (!sb) {
    return null;
  }

  try {
    const { data, error } = await sb
      .from("sections")
      .select("id, slug, name")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      console.error("[getSectionBySlug] Error:", error);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      slug: data.slug || "",
      name: data.name || data.slug || "",
    };
  } catch (error) {
    console.error("[getSectionBySlug] Error:", error);
    return null;
  }
}

