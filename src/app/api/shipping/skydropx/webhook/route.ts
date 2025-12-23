import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeShippingStatus, isValidShippingStatus } from "@/lib/orders/statuses";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Mapea eventos de Skydropx a estados canónicos de shipping
 */
function mapSkydropxEventToShippingStatus(
  eventType: string,
  status?: string,
): string | null {
  // Normalizar eventType y status a lowercase
  const normalizedEvent = eventType?.toLowerCase().trim();
  const normalizedStatus = status?.toLowerCase().trim();

  // Mapeo de eventos comunes de Skydropx
  if (normalizedEvent === "picked_up" || normalizedEvent === "in_transit") {
    return "in_transit";
  }
  if (normalizedEvent === "delivered") {
    return "delivered";
  }
  if (normalizedEvent === "exception" || normalizedEvent === "cancelled" || normalizedEvent === "canceled") {
    return "cancelled";
  }
  if (normalizedEvent === "label_created" || normalizedEvent === "created") {
    return "label_created";
  }

  // Si viene un status directo, intentar normalizarlo
  if (normalizedStatus) {
    const normalized = normalizeShippingStatus(normalizedStatus);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/**
 * Valida el webhook de Skydropx usando un shared secret
 */
function validateWebhookSecret(request: NextRequest): boolean {
  const secret = process.env.SKYDROPX_WEBHOOK_SECRET;
  if (!secret) {
    // Si no hay secret configurado, permitir en desarrollo pero loguear warning
    if (process.env.NODE_ENV === "development") {
      console.warn("[skydropx/webhook] SKYDROPX_WEBHOOK_SECRET no configurado, permitiendo en dev");
      return true;
    }
    return false;
  }

  // Verificar header de autorización o custom header
  const authHeader = request.headers.get("x-skydropx-secret") || request.headers.get("authorization");
  if (!authHeader) {
    return false;
  }

  // Si viene en Authorization header, puede ser "Bearer <secret>" o solo el secret
  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  return providedSecret === secret;
}

export async function POST(req: NextRequest) {
  try {
    // Validar secret del webhook
    if (!validateWebhookSecret(req)) {
      console.error("[skydropx/webhook] Webhook secret inválido o faltante");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    // Extraer datos del webhook de Skydropx
    // Estructura esperada puede variar, pero típicamente incluye:
    // - event_type o type
    // - tracking_number o trackingNumber
    // - order_id o orderId
    // - status
    const eventType = body.event_type || body.type || body.event || "";
    const trackingNumber = body.tracking_number || body.trackingNumber || body.tracking || null;
    const orderId = body.order_id || body.orderId || body.order || null;
    const status = body.status || body.shipping_status || null;

    if (!orderId) {
      console.warn("[skydropx/webhook] Webhook sin order_id, ignorando:", {
        eventType,
        trackingNumber,
      });
      return NextResponse.json({ received: true, message: "No order_id provided" });
    }

    // Mapear evento a shipping_status canónico
    const shippingStatus = mapSkydropxEventToShippingStatus(eventType, status);
    if (!shippingStatus || !isValidShippingStatus(shippingStatus)) {
      console.warn("[skydropx/webhook] No se pudo mapear evento a shipping_status:", {
        eventType,
        status,
        orderId,
      });
      return NextResponse.json({ received: true, message: "Event not mapped to shipping status" });
    }

    // Crear cliente Supabase con service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[skydropx/webhook] Configuración de Supabase incompleta");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Buscar orden por order_id (puede ser UUID o string)
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_status")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[skydropx/webhook] Error al buscar orden:", {
        orderId,
        error: fetchError,
      });
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 },
      );
    }

    if (!order) {
      console.warn("[skydropx/webhook] Orden no encontrada:", { orderId });
      return NextResponse.json({ received: true, message: "Order not found" });
    }

    // Solo actualizar si es una orden de Skydropx
    if (order.shipping_provider !== "skydropx") {
      console.warn("[skydropx/webhook] Orden no es de Skydropx, ignorando:", {
        orderId,
        provider: order.shipping_provider,
      });
      return NextResponse.json({ received: true, message: "Order not from Skydropx" });
    }

    // Preparar actualización
    const updateData: Record<string, unknown> = {
      shipping_status: shippingStatus,
    };

    // Si viene tracking_number y no está en la orden, actualizarlo
    if (trackingNumber && typeof trackingNumber === "string") {
      updateData.shipping_tracking_number = trackingNumber;
    }

    // Actualizar orden
    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (updateError) {
      console.error("[skydropx/webhook] Error al actualizar orden:", {
        orderId,
        error: updateError,
        updateData,
      });
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 },
      );
    }

    console.log("[skydropx/webhook] Orden actualizada:", {
      orderId,
      eventType,
      shippingStatus,
      trackingNumber: trackingNumber || "no actualizado",
    });

    return NextResponse.json({
      received: true,
      orderId,
      shippingStatus,
    });
  } catch (error) {
    console.error("[skydropx/webhook] Error inesperado:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

