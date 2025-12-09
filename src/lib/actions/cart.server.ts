"use server";

import { createActionSupabase } from "@/lib/supabase/server-actions";
import { clearCartForUser } from "@/lib/cart/clearCartForUser.server";

/**
 * Server action para limpiar el carrito del usuario autenticado
 * Se usa después de crear una orden exitosamente
 */
export async function clearCartAction(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createActionSupabase();

    // Obtener usuario autenticado
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      // Si no hay usuario, no hay carrito que limpiar (puede ser invitado)
      return { success: true };
    }

    // Limpiar carrito del usuario
    return await clearCartForUser(supabase, user.id);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    if (process.env.NODE_ENV === "development") {
      console.error("[clearCartAction] Excepción:", errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

