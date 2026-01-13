/**
 * Helpers para idempotencia de emails de pedidos
 * Guarda marcas en orders.metadata.email_events para evitar envíos duplicados
 */

import { createClient } from "@supabase/supabase-js";

export type EmailEventKey =
  | "payment_confirmed_sent_at"
  | "shipping_created_sent_at"
  | "delivered_sent_at"
  | "needs_address_review_sent_at";

/**
 * Verifica si ya se envió un email para un evento específico
 * @param metadata - metadata de la orden
 * @param key - clave del evento (ej: "payment_confirmed_sent_at")
 * @returns true si ya se envió, false si se debe enviar
 */
export function shouldSend(
  metadata: unknown,
  key: EmailEventKey,
): boolean {
  if (!metadata || typeof metadata !== "object") {
    return true; // Si no hay metadata, permitir envío
  }

  const meta = metadata as Record<string, unknown>;
  const emailEvents = meta.email_events as Record<string, unknown> | undefined;

  if (!emailEvents || typeof emailEvents !== "object") {
    return true; // Si no hay email_events, permitir envío
  }

  // Si ya existe la marca, no enviar
  return !emailEvents[key];
}

/**
 * Marca un email como enviado en orders.metadata.email_events
 * Hace merge seguro (no sobrescribe metadata completo)
 * @param orderId - ID de la orden
 * @param key - clave del evento
 * @returns true si se marcó exitosamente, false si falló
 */
export async function markSent(
  orderId: string,
  key: EmailEventKey,
): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[markSent] Configuración de Supabase incompleta", {
      orderId,
      key,
    });
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Obtener metadata actual
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("metadata")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      console.error("[markSent] Error al obtener orden", {
        orderId,
        key,
        error: fetchError,
      });
      return false;
    }

    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const emailEvents = (currentMetadata.email_events as Record<string, unknown>) || {};

    // Merge seguro: solo actualizar email_events, preservar todo lo demás
    const updatedEmailEvents = {
      ...emailEvents,
      [key]: new Date().toISOString(),
    };

    const updatedMetadata = {
      ...currentMetadata,
      email_events: updatedEmailEvents,
    };

    // Actualizar solo metadata
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[markSent] Error al actualizar metadata", {
        orderId,
        key,
        error: updateError,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("[markSent] Error inesperado", {
      orderId,
      key,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    });
    return false;
  }
}
