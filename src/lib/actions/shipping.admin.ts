"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import type { PaymentStatus } from "@/lib/orders/paymentStatus";
import { buildShippingEmail } from "@/lib/notifications/shipping";
import { sendTransactionalEmail } from "@/lib/notifications/email";
import { buildBankTransferEmail } from "@/lib/notifications/payment";
import { checkAdminAccess } from "@/lib/admin/access";

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

    // Obtener la orden con todos los campos necesarios para notificaciones
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        "id, email, contact_email, contact_name, metadata, shipping_provider, shipping_service_name, shipping_tracking_number, shipping_status, last_notified_shipping_status",
      )
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[updateShippingStatusAdmin] Error al obtener orden", {
        orderId,
        error: fetchError,
      });
      return {
        success: false,
        error: "Error al obtener la orden",
      };
    }

    if (!order) {
      console.warn("[updateShippingStatusAdmin] Orden no encontrada", { orderId });
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // Obtener email del cliente (prioridad: contact_email > email > metadata.contact_email)
    const customerEmail = order.contact_email || order.email || (order.metadata as { contact_email?: string } | null)?.contact_email || null;
    const customerName = order.contact_name || (order.metadata as { contact_name?: string } | null)?.contact_name || null;

    // Verificar idempotencia: solo notificar si el estado cambió
    const shouldNotify =
      order.shipping_status !== newStatus &&
      order.last_notified_shipping_status !== newStatus;

    // Actualizar el estado
    const updateData: { shipping_status: ShippingStatus; updated_at?: string; last_notified_shipping_status?: ShippingStatus } = {
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
            // Actualizar last_notified_shipping_status solo si el email se envió exitosamente
            updateData.last_notified_shipping_status = newStatus;
            console.log(
              "[updateShippingStatusAdmin] Notificación enviada exitosamente",
              {
                orderId,
                newStatus,
              },
            );
          } else {
            console.warn(
              "[updateShippingStatusAdmin] Email no enviado",
              {
                orderId,
                newStatus,
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
      console.error(
        "[updateShippingStatusAdmin] Error al actualizar estado en base de datos",
        {
          orderId,
          newStatus,
          error:
            updateError instanceof Error
              ? { name: updateError.name, message: updateError.message }
              : String(updateError),
        },
      );
      return {
        success: false,
        error: "No se pudo actualizar el estado de envío",
      };
    }

    if (!updateResult) {
      console.warn(
        "[updateShippingStatusAdmin] No se actualizó ninguna fila",
        {
          orderId,
          newStatus,
        },
      );
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // Revalidar rutas
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);

    return { success: true };
  } catch (error) {
    console.error(
      "[updateShippingStatusAdmin] Error inesperado",
      {
        orderId,
        newStatus,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : String(error),
      },
    );
    return {
      success: false,
      error: "Error inesperado al actualizar el estado",
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
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Validar que el estado es válido
    const validStatuses: PaymentStatus[] = ["pending", "paid", "canceled"];
    
    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: "Estado de pago inválido",
      };
    }

    // Usar service role para actualizar (solo admin puede llamar esto)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[updatePaymentStatusAdmin] Configuración de Supabase incompleta");
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
      .select("id, payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[updatePaymentStatusAdmin] Error al obtener orden", {
        orderId,
        error: fetchError,
      });
      return {
        success: false,
        error: "Error al obtener la orden",
      };
    }

    if (!order) {
      console.warn("[updatePaymentStatusAdmin] Orden no encontrada", { orderId });
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // Actualizar el estado de pago
    const { data: updateResult, error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error(
        "[updatePaymentStatusAdmin] Error al actualizar estado en base de datos",
        {
          orderId,
          newStatus,
          error:
            updateError instanceof Error
              ? { name: updateError.name, message: updateError.message }
              : String(updateError),
        },
      );
      return {
        success: false,
        error: "No se pudo actualizar el estado de pago",
      };
    }

    if (!updateResult) {
      console.warn(
        "[updatePaymentStatusAdmin] No se actualizó ninguna fila",
        {
          orderId,
          newStatus,
        },
      );
      return {
        success: false,
        error: "Orden no encontrada",
      };
    }

    // Revalidar rutas
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);

    return { success: true };
  } catch (error) {
    console.error(
      "[updatePaymentStatusAdmin] Error inesperado",
      {
        orderId,
        newStatus,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : String(error),
      },
    );
    return {
      success: false,
      error: "Error inesperado al actualizar el estado",
    };
  }
}

/**
 * Reenvía las instrucciones de pago por transferencia al cliente (solo admin)
 * @param orderId - ID de la orden
 */
export async function resendBankTransferInstructionsAdmin(
  orderId: string,
): Promise<{ ok: true } | { ok: false; error: "unauthorized" | "order_not_found" | "invalid_payment_method" | "no_email" | "email_disabled" | "send_failed"; errorMessage?: string }> {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return { ok: false, error: "unauthorized" };
    }

    // Usar service role para leer la orden
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[resendBankTransferInstructionsAdmin] Configuración de Supabase incompleta");
      return { ok: false, error: "send_failed", errorMessage: "Configuración incompleta" };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Cargar la orden
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, email, payment_method, payment_status, total_cents, metadata")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[resendBankTransferInstructionsAdmin] Error al obtener orden", {
        orderId,
        error: fetchError,
      });
      return { ok: false, error: "order_not_found" };
    }

    if (!order) {
      return { ok: false, error: "order_not_found" };
    }

    // Verificar que es transferencia pendiente
    if (order.payment_method !== "bank_transfer") {
      return { ok: false, error: "invalid_payment_method" };
    }

    if (order.payment_status !== "pending") {
      // No es crítico, pero idealmente solo se reenvía si está pendiente
      console.warn("[resendBankTransferInstructionsAdmin] Reenviando instrucciones para orden que no está pendiente", {
        orderId,
        payment_status: order.payment_status,
      });
    }

    // Obtener email del cliente
    const rawMetadata = (order.metadata ?? null) as
      | { contact_email?: string; contactEmail?: string; contact_name?: string; contactName?: string }
      | null;
    const customerEmail = rawMetadata?.contact_email ?? rawMetadata?.contactEmail ?? order.email;
    const customerName = rawMetadata?.contact_name ?? rawMetadata?.contactName ?? null;

    if (!customerEmail) {
      return { ok: false, error: "no_email" };
    }

    // Verificar si email está habilitado
    const emailEnabled = process.env.EMAIL_ENABLED === "true";
    if (!emailEnabled) {
      console.warn("[resendBankTransferInstructionsAdmin] Email deshabilitado, no se enviará correo", {
        orderId,
        customerEmail,
      });
      return { ok: false, error: "email_disabled" };
    }

    // Construir y enviar el correo
    const totalCents = order.total_cents ?? 0;
    const emailContent = buildBankTransferEmail({
      orderId: order.id,
      customerEmail,
      customerName,
      totalCents,
    });

    const emailResult = await sendTransactionalEmail({
      to: customerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!emailResult.ok) {
      console.error("[resendBankTransferInstructionsAdmin] Error al enviar correo", {
        orderId,
        customerEmail,
        reason: emailResult.reason,
        error: emailResult.error,
      });
      return {
        ok: false,
        error: emailResult.reason === "disabled" ? "email_disabled" : "send_failed",
        errorMessage: emailResult.error,
      };
    }

    console.log("[resendBankTransferInstructionsAdmin] Instrucciones reenviadas exitosamente", {
      orderId,
      customerEmail,
    });

    return { ok: true };
  } catch (error) {
    console.error("[resendBankTransferInstructionsAdmin] Error inesperado", {
      orderId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : String(error),
    });
    return {
      ok: false,
      error: "send_failed",
      errorMessage: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

