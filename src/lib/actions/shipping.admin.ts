"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";

/**
 * Crea una guía de envío en Skydropx para una orden
 * Usa el endpoint interno /api/shipping/create-shipment
 */
export async function createSkydropxLabelAction(
  orderId: string,
  _formData: FormData,
): Promise<void> {
  try {
    // Llamar al endpoint interno
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : "http://localhost:3000";
    
    const response = await fetch(`${baseUrl}/api/shipping/create-shipment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    const data = await response.json().catch(() => ({ ok: false, reason: "unknown_error" }));

    if (!data.ok) {
      // Mapear razones de error a mensajes de query string
      const errorMap: Record<string, string> = {
        invalid_order_id: "orden_no_encontrada",
        order_not_found: "orden_no_encontrada",
        unsupported_provider: "proveedor_no_soportado",
        missing_shipping_rate: "rate_id_no_encontrado",
        missing_address_data: "direccion_incompleta",
        skydropx_error: "skydropx_label_failed",
        unknown_error: "error_desconocido",
      };
      
      const errorKey = errorMap[data.reason || "unknown_error"] || "error_desconocido";
      redirect(`/admin/pedidos/${orderId}?error=${errorKey}`);
      return;
    }

    // Revalidar rutas
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);

    redirect(`/admin/pedidos/${orderId}?success=skydropx_label_created`);
  } catch (error) {
    console.error("[createSkydropxLabelAction] Error inesperado:", error);
    redirect(`/admin/pedidos/${orderId}?error=error_desconocido`);
  }
}

/**
 * Actualiza el estado de envío de una orden (solo admin)
 * @param orderId - ID de la orden
 * @param newStatus - Nuevo estado de envío
 */
export async function updateShippingStatusAdmin(
  orderId: string,
  newStatus: ShippingStatus,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Validar que el estado es válido
    const validStatuses: ShippingStatus[] = [
      "pending",
      "created",
      "in_transit",
      "ready_for_pickup",
      "delivered",
      "canceled",
    ];
    
    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: "Estado de envío inválido",
      };
    }

    // Usar service role para actualizar (solo admin puede llamar esto)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[updateShippingStatusAdmin] Configuración de Supabase incompleta");
      return {
        success: false,
        error: "Error de configuración del servidor",
      };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar que la orden existe
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // Actualizar el estado
    const { error: updateError } = await supabase
      .from("orders")
      .update({ shipping_status: newStatus })
      .eq("id", orderId);

    if (updateError) {
      console.error("[updateShippingStatusAdmin] Error al actualizar:", updateError);
      return {
        success: false,
        error: "No se pudo actualizar el estado de envío",
      };
    }

    // Revalidar rutas
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);

    return { success: true };
  } catch (error) {
    console.error("[updateShippingStatusAdmin] Error inesperado:", error);
    return {
      success: false,
      error: "Error inesperado al actualizar el estado",
    };
  }
}

