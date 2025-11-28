import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 */
function createServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de Supabase (URL o SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Tipo para sección
 */
export type AdminSection = {
  id: string; // UUID
  slug: string;
  name: string;
};

/**
 * Obtiene todas las secciones disponibles desde public.sections
 */
export async function getAdminSections(): Promise<AdminSection[]> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("sections")
      .select("id, slug, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("[getAdminSections] Error:", error);
      throw new Error(`Error al obtener secciones: ${error.message}`);
    }

    return (data || []).map((s) => ({
      id: s.id,
      slug: s.slug || "",
      name: s.name || s.slug || "",
    }));
  } catch (err) {
    console.error("[getAdminSections] Error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Error inesperado al obtener secciones");
  }
}

/**
 * Obtiene una sección por ID
 */
export async function getAdminSectionById(
  id: string,
): Promise<AdminSection | null> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("sections")
      .select("id, slug, name")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[getAdminSectionById] Error:", error);
      throw new Error(`Error al obtener sección: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      slug: data.slug || "",
      name: data.name || data.slug || "",
    };
  } catch (err) {
    console.error("[getAdminSectionById] Error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Error inesperado al obtener sección");
  }
}

/**
 * Crea una nueva sección
 */
export async function createAdminSection(input: {
  slug: string;
  name: string;
}): Promise<AdminSection> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("sections")
      .insert({
        slug: input.slug,
        name: input.name,
      })
      .select("id, slug, name")
      .single();

    if (error) {
      console.error("[createAdminSection] Error:", error);
      throw new Error(`Error al crear sección: ${error.message}`);
    }

    if (!data) {
      throw new Error("No se pudo crear la sección");
    }

    return {
      id: data.id,
      slug: data.slug || "",
      name: data.name || data.slug || "",
    };
  } catch (err) {
    console.error("[createAdminSection] Error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Error inesperado al crear sección");
  }
}

/**
 * Actualiza una sección existente
 */
export async function updateAdminSection(
  id: string,
  input: { slug: string; name: string },
): Promise<AdminSection> {
  const supabase = createServiceRoleSupabase();

  try {
    const { data, error } = await supabase
      .from("sections")
      .update({
        slug: input.slug,
        name: input.name,
      })
      .eq("id", id)
      .select("id, slug, name")
      .single();

    if (error) {
      console.error("[updateAdminSection] Error:", error);
      throw new Error(`Error al actualizar sección: ${error.message}`);
    }

    if (!data) {
      throw new Error("No se pudo actualizar la sección");
    }

    return {
      id: data.id,
      slug: data.slug || "",
      name: data.name || data.slug || "",
    };
  } catch (err) {
    console.error("[updateAdminSection] Error:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Error inesperado al actualizar sección");
  }
}

