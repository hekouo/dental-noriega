import "server-only";
import { createClient } from "@/lib/supabase/public";

/**
 * Devuelve las secciones que tienen al menos un producto activo.
 * Regla: solo mostramos secciones con al menos un producto activo en /tienda.
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
    // Partimos de sections y hacemos join a products vía section_id
    const { data, error } = await sb
      .from("sections")
      .select(
        `
        id,
        slug,
        name,
        products!inner (
          id,
          active
        )
      `,
      )
      .eq("products.active", true);

    if (error) {
      console.error("[getSectionsWithActiveProducts] Error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // data puede traer products como array; solo nos interesa que exista al menos uno
    type Row = {
      id: string;
      slug: string | null;
      name: string | null;
    };

    const sections: Row[] = (data as Row[]).map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
    }));

    const uniqueById = new Map<string, { id: string; slug: string; name: string }>();
    for (const s of sections) {
      if (!s.id || uniqueById.has(s.id)) continue;
      uniqueById.set(s.id, {
        id: s.id,
        slug: s.slug || "",
        name: s.name || s.slug || "",
      });
    }

    return Array.from(uniqueById.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  } catch (error) {
    console.error("[getSectionsWithActiveProducts] Error:", error);
    return [];
  }
}


