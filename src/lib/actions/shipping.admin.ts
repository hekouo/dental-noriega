"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import type { PaymentStatus } from "@/lib/orders/paymentStatus";
import { buildShippingEmail } from "@/lib/notifications/shipping";
import { sendTransactionalEmail } from "@/lib/notifications/email";

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
    console.error(
      "[createSkydropxLabelAction] Error inesperado",
      {
        orderId,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : String(error),
      },
    );
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
): Promise<{ ok: true } | { ok: false; code: "order-not-found" | "fetch-error" | "update-error" | "invalid-status" | "config-error" }> {
  try {
    console.log("[updateShippingStatusAdmin] Iniciando", { orderId, newStatus });

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
      console.error("[updateShippingStatusAdmin] Estado inválido", { orderId, newStatus });
      return {
        ok: false,
        code: "invalid-status",
      };
    }

    // Usar service role para actualizar (solo admin puede llamar esto)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[updateShippingStatusAdmin] Configuración de Supabase incompleta", { orderId });
      return {
        ok: false,
        code: "config-error",
      };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // SELECT inicial: solo columnas que realmente existen y necesitamos
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, shipping_status, shipping_provider, shipping_service_name, shipping_tracking_number, contact_email, contact_name, email")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[updateShippingStatusAdmin] Error al obtener orden", {
        orderId,
        newStatus,
        error: fetchError,
      });
      return {
        ok: false,
        code: "fetch-error",
      };
    }

    if (!order) {
      console.warn("[updateShippingStatusAdmin] Orden no encontrada", { orderId });
      return {
        ok: false,
        code: "order-not-found",
      };
    }

    // Obtener email del cliente (prioridad: contact_email > email)
    const customerEmail = order.contact_email || order.email || null;
    const customerName = order.contact_name || null;

    // Verificar idempotencia: solo notificar si el estado cambió
    const shouldNotify = order.shipping_status !== newStatus;

    // Actualizar el estado
    const updateData: { shipping_status: ShippingStatus; updated_at: string } = {
      shipping_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    // Intentar enviar notificación (no bloquea si falla)
    if (shouldNotify && customerEmail) {
      try {
        const emailContent = buildShippingEmail({
          status: newStatus,
          orderId: order.id,
          customerEmail,
          customerName,
          shippingProvider: order.shipping_provider || null,
          shippingServiceName: order.shipping_service_name || null,
          trackingNumber: order.shipping_tracking_number || null,
        });

        if (emailContent) {
          const emailResult = await sendTransactionalEmail({
            to: customerEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          if (emailResult.ok) {
            console.log(
              "[updateShippingStatusAdmin] Notificación enviada exitosamente",
              {
                orderId,
                newStatus,
                customerEmail,
              },
            );
          } else {
            console.warn(
              "[updateShippingStatusAdmin] Email no enviado",
              {
                orderId,
                newStatus,
                customerEmail,
                reason: emailResult.reason,
                error: emailResult.error,
              },
            );
          }
        }
      } catch (emailError) {
        // No romper el flujo si falla el email
        console.error(
          "[updateShippingStatusAdmin] Error al enviar notificación",
          {
            orderId,
            newStatus,
            customerEmail,
            error:
              emailError instanceof Error
                ? { name: emailError.name, message: emailError.message }
                : String(emailError),
          },
        );
      }
    }

    // Actualizar el estado en la base de datos
    const { data: updateResult, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[updateShippingStatusAdmin] Error al actualizar estado", {
        orderId,
        newStatus,
        payload: updateData,
        error: updateError,
      });
      return {
        ok: false,
        code: "update-error",
      };
    }

    if (!updateResult) {
      console.warn("[updateShippingStatusAdmin] No se actualizó ninguna fila", {
        orderId,
        newStatus,
        payload: updateData,
      });
      return {
        ok: false,
        code: "order-not-found",
      };
    }

    console.log("[updateShippingStatusAdmin] Estado actualizado exitosamente", {
      orderId,
      newStatus,
      previousStatus: order.shipping_status,
    });

    // Revalidar rutas
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);

    return { ok: true };
  } catch (error) {
    console.error("[updateShippingStatusAdmin] Error inesperado", {
      orderId,
      newStatus,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    });
    return {
      ok: false,
      code: "update-error",
    };
  }
}

/**
 * Actualiza el estado de pago de una orden (solo admin)
 * @param orderId - ID de la orden
 * @param newStatus - Nuevo estado de pago
 */
export async function updatePaymentStatusAdmin(
  orderId: string,
  newStatus: PaymentStatus,
): Promise<{ ok: true } | { ok: false; code: "order-not-found" | "fetch-error" | "update-error" | "invalid-status" | "config-error" }> {
  try {
    console.log("[updatePaymentStatusAdmin] Iniciando", { orderId, newStatus });

    // Validar que el estado es válido
    const validStatuses: PaymentStatus[] = ["pending", "paid", "canceled"];
    
    if (!validStatuses.includes(newStatus)) {
      console.error("[updatePaymentStatusAdmin] Estado inválido", { orderId, newStatus });
      return {
        ok: false,
        code: "invalid-status",
      };
    }

    // Usar service role para actualizar (solo admin puede llamar esto)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[updatePaymentStatusAdmin] Configuración de Supabase incompleta", { orderId });
      return {
        ok: false,
        code: "config-error",
      };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // SELECT inicial: solo columnas que realmente existen
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[updatePaymentStatusAdmin] Error al obtener orden", {
        orderId,
        newStatus,
        error: fetchError,
      });
      return {
        ok: false,
        code: "fetch-error",
      };
    }

    if (!order) {
      console.warn("[updatePaymentStatusAdmin] Orden no encontrada", { orderId });
      return {
        ok: false,
        code: "order-not-found",
      };
    }

    // Actualizar el estado de pago
    const updateData = {
      payment_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const { data: updateResult, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[updatePaymentStatusAdmin] Error al actualizar estado", {
        orderId,
        newStatus,
        payload: updateData,
        error: updateError,
      });
      return {
        ok: false,
        code: "update-error",
      };
    }

    if (!updateResult) {
      console.warn("[updatePaymentStatusAdmin] No se actualizó ninguna fila", {
        orderId,
        newStatus,
        payload: updateData,
      });
      return {
        ok: false,
        code: "order-not-found",
      };
    }

    console.log("[updatePaymentStatusAdmin] Estado actualizado exitosamente", {
      orderId,
      newStatus,
      previousStatus: order.payment_status,
    });

    // Revalidar rutas
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);

    return { ok: true };
  } catch (error) {
    console.error("[updatePaymentStatusAdmin] Error inesperado", {
      orderId,
      newStatus,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : String(error),
    });
    return {
      ok: false,
      code: "update-error",
    };
  }
}

