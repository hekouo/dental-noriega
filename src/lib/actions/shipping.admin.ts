"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import { isValidShippingStatus } from "@/lib/orders/shippingStatus";

/**
 * Actualiza el estado de envío de una orden (solo admin)
 */
export async function updateShippingStatusAction(
  orderId: string,
  newStatus: ShippingStatus,
): Promise<{ success: boolean; error?: string }> {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status !== "allowed") {
    return { success: false, error: "Acceso denegado" };
  }

  // Validar estado
  if (!isValidShippingStatus(newStatus)) {
    return { success: false, error: "Estado de envío inválido" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[updateShippingStatusAction] Configuración de Supabase incompleta");
    return { success: false, error: "Error de configuración" };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase
    .from("orders")
    .update({ shipping_status: newStatus })
    .eq("id", orderId);

  if (error) {
    console.error("[updateShippingStatusAction] Error al actualizar:", error);
    return { success: false, error: "No se pudo actualizar el estado de envío" };
  }

  // Revalidar rutas
  revalidatePath("/admin/pedidos");
  revalidatePath(`/admin/pedidos/${orderId}`);

  return { success: true };
}

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

