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

/**
 * Actualiza campos de envío y notas internas de una orden
 * @param orderId - ID de la orden (UUID)
 * @param updates - Campos a actualizar (solo los permitidos)
 * @returns { ok: true } o { ok: false, error: "..." }
 */
export async function updateOrderShippingAndNotes(
  orderId: string,
  updates: {
    admin_notes?: string | null;
    shipping_status?: string | null;
    shipping_tracking_number?: string | null;
    shipping_label_url?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      console.error("[updateOrderShippingAndNotes] Acceso denegado:", {
        orderId,
        accessStatus: access.status,
      });
      return { ok: false, error: "access-denied" };
    }

    if (!orderId || orderId.trim().length === 0) {
      console.error("[updateOrderShippingAndNotes] orderId vacío");
      return { ok: false, error: "invalid-order-id" };
    }

    const normalizedOrderId = orderId.trim();

    // Validar que solo se actualicen campos permitidos
    const updateData: Record<string, unknown> = {};

    if (updates.admin_notes !== undefined) {
      updateData.admin_notes = updates.admin_notes?.trim() || null;
    }
    if (updates.shipping_status !== undefined) {
      // Validar que shipping_status sea válido o null
      const status = updates.shipping_status?.trim() || null;
      if (status && status.length > 0) {
        updateData.shipping_status = status;
      } else {
        updateData.shipping_status = null;
      }
    }
    if (updates.shipping_tracking_number !== undefined) {
      updateData.shipping_tracking_number = updates.shipping_tracking_number?.trim() || null;
    }
    if (updates.shipping_label_url !== undefined) {
      updateData.shipping_label_url = updates.shipping_label_url?.trim() || null;
    }

    // Si no hay nada que actualizar, retornar éxito
    if (Object.keys(updateData).length === 0) {
      return { ok: true };
    }

    const supabase = createServiceRoleSupabase();

    // Verificar que la orden existe
    const { data: existingOrder, error: fetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", normalizedOrderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[updateOrderShippingAndNotes] Error al buscar orden:", {
        orderId: normalizedOrderId,
        error: fetchError,
      });
      return { ok: false, error: "fetch-error" };
    }

    if (!existingOrder) {
      console.error("[updateOrderShippingAndNotes] Orden no encontrada:", {
        orderId: normalizedOrderId,
      });
      return { ok: false, error: "order-not-found" };
    }

    // Actualizar campos permitidos
    const { data, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", normalizedOrderId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[updateOrderShippingAndNotes] Error al actualizar orden:", {
        orderId: normalizedOrderId,
        error: updateError,
      });
      return { ok: false, error: "update-error" };
    }

    if (!data) {
      console.error("[updateOrderShippingAndNotes] No se actualizó ninguna fila:", {
        orderId: normalizedOrderId,
      });
      return { ok: false, error: "update-error" };
    }

    console.log("[updateOrderShippingAndNotes] Campos actualizados correctamente:", {
      orderId: normalizedOrderId,
      updatedFields: Object.keys(updateData),
    });

    return { ok: true };
  } catch (err) {
    console.error("[updateOrderShippingAndNotes] Error inesperado:", {
      orderId,
      error: err,
    });
    return { ok: false, error: "unexpected-error" };
  }
}

