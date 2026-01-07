import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeShippingStatus, isValidShippingStatus } from "@/lib/orders/statuses";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Mapea eventos/estados de Skydropx a estados canónicos de shipping
 */
function mapSkydropxEventToShippingStatus(
  eventType: string | null | undefined,
  status: string | null | undefined,
): string | null {
  // Normalizar eventType y status a lowercase
  const normalizedEvent = eventType?.toLowerCase().trim() || "";
  const normalizedStatus = status?.toLowerCase().trim() || "";

  // Mapeo de estados específicos de Skydropx
  if (normalizedStatus) {
    // delivered_to_branch -> ready_for_pickup
    if (normalizedStatus.includes("delivered_to_branch") || normalizedStatus.includes("ready_for_pickup")) {
      return "ready_for_pickup";
    }
    // last_mile -> in_transit
    if (normalizedStatus.includes("last_mile") || normalizedStatus.includes("picked_up") || normalizedStatus.includes("in_transit")) {
      return "in_transit";
    }
    // in_return -> cancelled
    if (normalizedStatus.includes("in_return")) {
      return "cancelled";
    }
    // delivered -> delivered
    if (normalizedStatus.includes("delivered")) {
      return "delivered";
    }
    // exception / cancelled / canceled -> cancelled
    if (normalizedStatus.includes("exception") || normalizedStatus.includes("cancelled") || normalizedStatus.includes("canceled")) {
      return "cancelled";
    }
    // created / label_created -> label_created
    if (normalizedStatus.includes("label_created") || normalizedStatus.includes("created")) {
      return "label_created";
    }
  }

  // Mapeo por eventType si no hay status
  if (normalizedEvent) {
    if (normalizedEvent === "picked_up" || normalizedEvent === "in_transit" || normalizedEvent === "last_mile") {
      return "in_transit";
    }
    if (normalizedEvent === "delivered") {
      return "delivered";
    }
    if (normalizedEvent === "delivered_to_branch") {
      return "ready_for_pickup";
    }
    if (normalizedEvent === "exception" || normalizedEvent === "cancelled" || normalizedEvent === "canceled" || normalizedEvent === "in_return") {
      return "cancelled";
    }
    if (normalizedEvent === "label_created" || normalizedEvent === "created") {
      return "label_created";
    }
  }

  // Intentar normalizar usando el helper genérico
  if (normalizedStatus) {
    const normalized = normalizeShippingStatus(normalizedStatus);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/**
 * Extrae datos del payload del webhook (soporta formato simple y JSON:API)
 */
function extractWebhookData(body: unknown): {
  eventType: string | null;
  trackingNumber: string | null;
  orderId: string | null;
  shipmentId: string | null;
  status: string | null;
} {
  if (!body || typeof body !== "object") {
    return {
      eventType: null,
      trackingNumber: null,
      orderId: null,
      shipmentId: null,
      status: null,
    };
  }

  const payload = body as Record<string, unknown>;

  // Formato JSON:API (data.id, data.attributes, etc.)
  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;

  // Extraer eventType (puede venir en varios lugares)
  const eventType =
    payload.event_type ||
    payload.type ||
    payload.event ||
    data?.type ||
    attributes?.event_type ||
    attributes?.type ||
    null;

  // Extraer tracking_number
  const trackingNumber =
    payload.tracking_number ||
    payload.trackingNumber ||
    payload.tracking ||
    attributes?.tracking_number ||
    attributes?.trackingNumber ||
    attributes?.tracking ||
    null;

  // Extraer order_id (UUID interno, opcional)
  const orderId =
    payload.order_id ||
    payload.orderId ||
    payload.order ||
    attributes?.order_id ||
    attributes?.orderId ||
    null;

  // Extraer shipment_id (ext id de Skydropx)
  const shipmentId =
    data?.id ||
    payload.shipment_id ||
    payload.shipmentId ||
    payload.shipment ||
    attributes?.shipment_id ||
    attributes?.shipmentId ||
    null;

  // Extraer status
  const status =
    payload.status ||
    payload.shipping_status ||
    attributes?.status ||
    attributes?.shipping_status ||
    null;

  return {
    eventType: typeof eventType === "string" ? eventType : null,
    trackingNumber: typeof trackingNumber === "string" ? trackingNumber : null,
    orderId: typeof orderId === "string" ? orderId : null,
    shipmentId: typeof shipmentId === "string" ? shipmentId : null,
    status: typeof status === "string" ? status : null,
  };
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

/**
 * Resuelve la orden usando prioridad: order_id (UUID) -> shipment_id -> tracking_number
 */
async function resolveOrder(
  supabase: ReturnType<typeof createClient<any, "public">>,
  orderId: string | null,
  shipmentId: string | null,
  trackingNumber: string | null,
): Promise<{ id: string; shipping_provider: string | null; shipping_tracking_number: string | null } | null> {
  // Prioridad 1: order_id (UUID interno)
  if (orderId && orderId.trim().length > 0) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number")
      .eq("id", orderId.trim())
      .maybeSingle();

    if (error) {
      console.error("[skydropx/webhook] Error al buscar orden por order_id:", {
        orderId,
        error,
      });
      return null;
    }

    if (data) {
      return data;
    }
  }

  // Prioridad 2: shipment_id (shipping_rate_ext_id)
  if (shipmentId && shipmentId.trim().length > 0) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number")
      .eq("shipping_rate_ext_id", shipmentId.trim())
      .maybeSingle();

    if (error) {
      console.error("[skydropx/webhook] Error al buscar orden por shipment_id:", {
        shipmentId,
        error,
      });
      return null;
    }

    if (data) {
      return data;
    }
  }

  // Prioridad 3: tracking_number
  if (trackingNumber && trackingNumber.trim().length > 0) {
    const { data, error } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number")
      .eq("shipping_tracking_number", trackingNumber.trim())
      .maybeSingle();

    if (error) {
      console.error("[skydropx/webhook] Error al buscar orden por tracking_number:", {
        trackingNumber,
        error,
      });
      return null;
    }

    if (data) {
      return data;
    }
  }

  return null;
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

    // Extraer datos del payload (soporta formato simple y JSON:API)
    const { eventType, trackingNumber, orderId, shipmentId, status } = extractWebhookData(body);

    // Mapear evento/estado a shipping_status canónico
    const shippingStatus = mapSkydropxEventToShippingStatus(eventType, status);
    if (!shippingStatus || !isValidShippingStatus(shippingStatus)) {
      console.warn("[skydropx/webhook] No se pudo mapear evento a shipping_status:", {
        eventType,
        status,
        orderId,
        shipmentId,
        trackingNumber,
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

    // Resolver orden con prioridad: order_id -> shipment_id -> tracking_number
    const order = await resolveOrder(supabase, orderId, shipmentId, trackingNumber);

    if (!order) {
      console.warn("[skydropx/webhook] Orden no encontrada con los identificadores proporcionados:", {
        orderId,
        shipmentId,
        trackingNumber,
      });
      return NextResponse.json({ received: true, message: "No matching order" });
    }

    // Solo actualizar si es una orden de Skydropx
    if (order.shipping_provider !== "skydropx") {
      console.warn("[skydropx/webhook] Orden no es de Skydropx, ignorando:", {
        orderId: order.id,
        provider: order.shipping_provider,
      });
      return NextResponse.json({ received: true, message: "Order not from Skydropx" });
    }

    // Cargar metadata completo para merge seguro
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("metadata")
      .eq("id", order.id)
      .single();

    // Preparar actualización
    const updateData: Record<string, unknown> = {
      shipping_status: shippingStatus,
    };

    // Si viene tracking_number y la orden no tiene uno, setearlo
    // Si ya tiene uno distinto, solo loguear en dev (no sobrescribir)
    if (trackingNumber && typeof trackingNumber === "string" && trackingNumber.trim().length > 0) {
      if (!order.shipping_tracking_number) {
        updateData.shipping_tracking_number = trackingNumber.trim();
      } else if (order.shipping_tracking_number !== trackingNumber.trim()) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[skydropx/webhook] Tracking number diferente, no sobrescribiendo:", {
            orderId: order.id,
            existing: order.shipping_tracking_number,
            incoming: trackingNumber,
          });
        }
      }
    }

    // Si el evento confirma cancelación (approved) o rechaza (rejected), actualizar metadata.shipping.cancel_status
    // Merge seguro de metadata (NO sobreescribir completo)
    if (fullOrder?.metadata) {
      const currentMetadata = fullOrder.metadata as Record<string, unknown>;
      const shippingMeta = (currentMetadata.shipping as Record<string, unknown>) || {};
      
      // Detectar si es evento de cancelación aprobada/rechazada
      const normalizedStatus = status?.toLowerCase().trim() || "";
      const normalizedEvent = eventType?.toLowerCase().trim() || "";
      
      if (
        normalizedStatus === "approved" ||
        normalizedStatus === "rejected" ||
        normalizedStatus === "cancelled" ||
        normalizedEvent === "cancel_approved" ||
        normalizedEvent === "cancel_rejected"
      ) {
        // Actualizar cancel_status en metadata (merge seguro)
        const updatedShippingMeta = {
          ...shippingMeta, // Preservar datos existentes
          cancel_status: normalizedStatus || normalizedEvent || "cancelled",
        };

        const updatedMetadata = {
          ...currentMetadata, // Preservar todos los campos existentes
          shipping: updatedShippingMeta,
        };

        updateData.metadata = updatedMetadata;
      }
    }

    // Actualizar orden
    const { error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", order.id);

    if (updateError) {
      console.error("[skydropx/webhook] Error al actualizar orden:", {
        orderId: order.id,
        error: updateError,
        updateData,
      });
      return NextResponse.json(
        { error: "Update failed" },
        { status: 500 },
      );
    }

    console.log("[skydropx/webhook] Orden actualizada:", {
      orderId: order.id,
      eventType,
      shippingStatus,
      trackingNumber: trackingNumber || "no actualizado",
      shipmentId: shipmentId || "no proporcionado",
    });

    return NextResponse.json({
      received: true,
      orderId: order.id,
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
