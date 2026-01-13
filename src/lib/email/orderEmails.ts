/**
 * Funciones para enviar emails de eventos de pedidos
 * Con idempotencia y flags de habilitación separados
 */

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { sendTransactionalEmail } from "@/lib/notifications/email";
import { isOrderEmailEnabled } from "./emailFlags";
import { shouldSend, markSent, type EmailEventKey } from "./orderEmailEvents";
import { buildPaymentConfirmedEmail } from "./templates/paymentConfirmed";
import { buildShippingCreatedEmail } from "./templates/shippingCreated";
import { buildDeliveredEmail } from "./templates/delivered";
import { buildNeedsAddressReviewEmail } from "./templates/needsAddressReview";
import { SITE_URL } from "@/lib/site";

/**
 * Obtiene una orden completa con items desde Supabase
 */
async function getOrderWithItems(orderId: string): Promise<{
  order: {
    id: string;
    email?: string | null;
    total_cents: number | null;
    shipping_tracking_number?: string | null;
    shipping_label_url?: string | null;
    shipping_provider?: string | null;
    shipping_service_name?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  items: Array<{
    title: string;
    qty: number;
    unit_price_cents: number;
  }>;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase no configurado");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Obtener orden
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, email, total_cents, shipping_tracking_number, shipping_label_url, shipping_provider, shipping_service_name, metadata",
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Orden no encontrada: ${orderError?.message || "unknown"}`);
  }

  // Obtener items
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("title, qty, unit_price_cents")
    .eq("order_id", orderId);

  if (itemsError) {
    console.warn("[orderEmails] Error al obtener items:", itemsError);
  }

  return {
    order: {
      id: order.id,
      email: order.email,
      total_cents: order.total_cents,
      shipping_tracking_number: order.shipping_tracking_number,
      shipping_label_url: order.shipping_label_url,
      shipping_provider: order.shipping_provider,
      shipping_service_name: order.shipping_service_name,
      metadata: order.metadata as Record<string, unknown> | null,
    },
    items:
      items?.map((item) => ({
        title: item.title || "Producto",
        qty: item.qty,
        unit_price_cents: item.unit_price_cents,
      })) || [],
  };
}

/**
 * Obtiene el email del cliente desde orden o metadata
 */
function getCustomerEmail(order: {
  email?: string | null;
  metadata?: Record<string, unknown> | null;
}): string | null {
  if (order.email) return order.email;

  const metadata = order.metadata || {};
  return (
    (metadata.contact_email as string | undefined) ||
    (metadata.contactEmail as string | undefined) ||
    null
  );
}

/**
 * Envía email de confirmación de pago
 */
export async function sendPaymentConfirmedEmail(
  orderId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  try {
    // Verificar flags
    if (!isOrderEmailEnabled()) {
      return { ok: true, sent: false }; // No enviar pero no es error
    }

    // Obtener orden
    const { order, items } = await getOrderWithItems(orderId);

    if (!order) {
      return { ok: false, error: "Orden no encontrada" };
    }

    // Verificar idempotencia
    if (!shouldSend(order.metadata, "payment_confirmed_sent_at")) {
      return { ok: true, sent: false }; // Ya se envió
    }

    // Obtener email del cliente
    const customerEmail = getCustomerEmail(order);
    if (!customerEmail) {
      return { ok: false, error: "No hay email del cliente" };
    }

    // Construir y enviar email
    const template = buildPaymentConfirmedEmail({
      order: {
        id: order.id,
        email: order.email ?? null,
        total_cents: order.total_cents,
        metadata: order.metadata ?? null,
      },
      orderItems: items,
      siteUrl: SITE_URL,
    });

    const result = await sendTransactionalEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!result.ok) {
      console.error("[sendPaymentConfirmedEmail] Error al enviar:", result);
      return { ok: false, error: result.reason || "send_failed" };
    }

    // Marcar como enviado (idempotencia)
    await markSent(orderId, "payment_confirmed_sent_at");

    return { ok: true, sent: true };
  } catch (error) {
    console.error("[sendPaymentConfirmedEmail] Error inesperado:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Envía email de envío generado (tracking/label disponible)
 */
export async function sendShippingCreatedEmail(
  orderId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  try {
    if (!isOrderEmailEnabled()) {
      return { ok: true, sent: false };
    }

    const { order } = await getOrderWithItems(orderId);

    if (!order) {
      return { ok: false, error: "Orden no encontrada" };
    }

    if (!shouldSend(order.metadata, "shipping_created_sent_at")) {
      return { ok: true, sent: false };
    }

    const customerEmail = getCustomerEmail(order);
    if (!customerEmail) {
      return { ok: false, error: "No hay email del cliente" };
    }

    const template = buildShippingCreatedEmail({
      order: {
        id: order.id,
        email: order.email ?? null,
        shipping_tracking_number: order.shipping_tracking_number ?? null,
        shipping_label_url: order.shipping_label_url ?? null,
        shipping_provider: order.shipping_provider ?? null,
        shipping_service_name: order.shipping_service_name ?? null,
        metadata: order.metadata ?? null,
      },
      siteUrl: SITE_URL,
    });

    const result = await sendTransactionalEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!result.ok) {
      console.error("[sendShippingCreatedEmail] Error al enviar:", result);
      return { ok: false, error: result.reason || "send_failed" };
    }

    await markSent(orderId, "shipping_created_sent_at");

    return { ok: true, sent: true };
  } catch (error) {
    console.error("[sendShippingCreatedEmail] Error inesperado:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Envía email de pedido entregado
 */
export async function sendDeliveredEmail(
  orderId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  try {
    if (!isOrderEmailEnabled()) {
      return { ok: true, sent: false };
    }

    const { order } = await getOrderWithItems(orderId);

    if (!order) {
      return { ok: false, error: "Orden no encontrada" };
    }

    if (!shouldSend(order.metadata, "delivered_sent_at")) {
      return { ok: true, sent: false };
    }

    const customerEmail = getCustomerEmail(order);
    if (!customerEmail) {
      return { ok: false, error: "No hay email del cliente" };
    }

    const template = buildDeliveredEmail({
      order: {
        id: order.id,
        email: order.email ?? null,
        shipping_tracking_number: order.shipping_tracking_number ?? null,
        metadata: order.metadata ?? null,
      },
      siteUrl: SITE_URL,
    });

    const result = await sendTransactionalEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!result.ok) {
      console.error("[sendDeliveredEmail] Error al enviar:", result);
      return { ok: false, error: result.reason || "send_failed" };
    }

    await markSent(orderId, "delivered_sent_at");

    return { ok: true, sent: true };
  } catch (error) {
    console.error("[sendDeliveredEmail] Error inesperado:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Envía email de solicitud de revisión de dirección/datos
 */
export async function sendNeedsAddressReviewEmail(
  orderId: string,
): Promise<{ ok: true; sent: boolean } | { ok: false; error: string }> {
  try {
    if (!isOrderEmailEnabled()) {
      return { ok: true, sent: false };
    }

    const { order } = await getOrderWithItems(orderId);

    if (!order) {
      return { ok: false, error: "Orden no encontrada" };
    }

    if (!shouldSend(order.metadata, "needs_address_review_sent_at")) {
      return { ok: true, sent: false };
    }

    const customerEmail = getCustomerEmail(order);
    if (!customerEmail) {
      return { ok: false, error: "No hay email del cliente" };
    }

    const template = buildNeedsAddressReviewEmail({
      order: {
        id: order.id,
        email: order.email ?? null,
        metadata: order.metadata ?? null,
      },
      siteUrl: SITE_URL,
    });

    const result = await sendTransactionalEmail({
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!result.ok) {
      console.error("[sendNeedsAddressReviewEmail] Error al enviar:", result);
      return { ok: false, error: result.reason || "send_failed" };
    }

    await markSent(orderId, "needs_address_review_sent_at");

    return { ok: true, sent: true };
  } catch (error) {
    console.error("[sendNeedsAddressReviewEmail] Error inesperado:", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
