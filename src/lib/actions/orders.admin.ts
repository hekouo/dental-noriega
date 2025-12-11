"use server";

import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";

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
 * Actualiza las notas internas de admin de una orden
 * @param orderId - ID de la orden (UUID)
 * @param notes - Texto de las notas (puede ser string vacío o null)
 * @returns { ok: true } o { ok: false, error: "..." }
 */
export async function updateAdminNotes(
  orderId: string,
  notes: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      console.error("[updateAdminNotes] Acceso denegado:", {
        orderId,
        accessStatus: access.status,
      });
      return { ok: false, error: "access-denied" };
    }

    if (!orderId || orderId.trim().length === 0) {
      console.error("[updateAdminNotes] orderId vacío");
      return { ok: false, error: "invalid-order-id" };
    }

    const normalizedOrderId = orderId.trim();
    const normalizedNotes = notes?.trim() || null;

    const supabase = createServiceRoleSupabase();

    // Verificar que la orden existe
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", normalizedOrderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[updateAdminNotes] Error al buscar orden:", {
        orderId: normalizedOrderId,
        error: fetchError,
      });
      return { ok: false, error: "fetch-error" };
    }

    if (!existingOrder) {
      console.error("[updateAdminNotes] Orden no encontrada:", {
        orderId: normalizedOrderId,
      });
      return { ok: false, error: "order-not-found" };
    }

    // Actualizar admin_notes
    const { data, error: updateError } = await supabase
      .from("orders")
      .update({ admin_notes: normalizedNotes })
      .eq("id", normalizedOrderId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[updateAdminNotes] Error al actualizar orden:", {
        orderId: normalizedOrderId,
        error: updateError,
      });
      return { ok: false, error: "update-error" };
    }

    if (!data) {
      console.error("[updateAdminNotes] No se actualizó ninguna fila:", {
        orderId: normalizedOrderId,
      });
      return { ok: false, error: "update-error" };
    }

    console.log("[updateAdminNotes] Notas actualizadas correctamente:", {
      orderId: normalizedOrderId,
      notesLength: normalizedNotes?.length || 0,
    });

    return { ok: true };
  } catch (err) {
    console.error("[updateAdminNotes] Error inesperado:", {
      orderId,
      error: err,
    });
    return { ok: false, error: "unexpected-error" };
  }
}

