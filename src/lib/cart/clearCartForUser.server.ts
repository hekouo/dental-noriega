import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Limpia el carrito de un usuario en Supabase (borra cart_items y opcionalmente el cart)
 * @param supabase Cliente de Supabase (puede ser server-side con service role o cliente autenticado)
 * @param userId ID del usuario
 * @returns { success: boolean, error?: string }
 */
export async function clearCartForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Obtener el cart_id del usuario
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (cartError) {
      // Si la tabla no existe o hay un error de RLS, no es crítico
      // Solo loguear en desarrollo
      if (process.env.NODE_ENV === "development") {
        console.warn("[clearCartForUser] Error al obtener cart:", cartError.message);
      }
      // Si no hay cart, no hay nada que limpiar
      if (cartError.code === "PGRST116") {
        return { success: true };
      }
      return { success: false, error: cartError.message };
    }

    if (!cart) {
      // No hay carrito, ya está limpio
      return { success: true };
    }

    const cartId = (cart as { id: string }).id;

    // 2. Borrar todos los cart_items del cart
    const { error: deleteItemsError } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartId);

    if (deleteItemsError) {
      // Si la tabla no existe, no es crítico
      if (process.env.NODE_ENV === "development") {
        console.warn("[clearCartForUser] Error al borrar cart_items:", deleteItemsError.message);
      }
      // Si la tabla no existe (PGRST205 o 42P01), considerar éxito
      const isMissingTable = deleteItemsError.code === "PGRST205" || deleteItemsError.code === "42P01";
      if (isMissingTable) {
        return { success: true };
      }
      return { success: false, error: deleteItemsError.message };
    }

    // 3. Opcional: borrar el cart también (aunque no es necesario, los items ya están borrados)
    // Dejamos el cart para que el usuario pueda seguir agregando items después

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    if (process.env.NODE_ENV === "development") {
      console.error("[clearCartForUser] Excepción:", errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

