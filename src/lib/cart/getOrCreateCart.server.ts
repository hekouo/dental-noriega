import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Obtiene o crea un carrito para un usuario
 * @param supabase Cliente de Supabase autenticado
 * @param userId ID del usuario
 * @returns ID del carrito o null si hay error
 */
export async function getOrCreateCartForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  try {
    // Intentar obtener el carrito existente
    const { data: existingCart, error: selectError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      // PGRST116 = no rows found, que es esperado si no hay carrito
      console.error("[getOrCreateCartForUser] Error al buscar carrito:", {
        userId,
        error: selectError.message,
        code: selectError.code,
      });
      return null;
    }

    // Si ya existe, devolver su ID
    if (existingCart) {
      const cart = existingCart as { id: string };
      return cart.id;
    }

    // Si no existe, crear uno nuevo
    const { data: newCart, error: insertError } = await supabase
      .from("carts")
      .insert({ user_id: userId } as never)
      .select("id")
      .single();

    if (insertError) {
      console.error("[getOrCreateCartForUser] Error al crear carrito:", {
        userId,
        error: insertError.message,
        code: insertError.code,
      });
      return null;
    }

    if (newCart) {
      const cart = newCart as { id: string };
      return cart.id;
    }

    return null;
  } catch (error) {
    console.error("[getOrCreateCartForUser] Excepción:", error);
    return null;
  }
}

