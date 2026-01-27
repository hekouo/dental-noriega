import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeShippingStatus, isValidShippingStatus } from "@/lib/orders/statuses";
import { normalizeShippingMetadata, addShippingMetadataDebug, preserveRateUsed, ensureRateUsedInMetadata } from "@/lib/shipping/normalizeShippingMetadata";
import { logPreWrite, logPostWrite } from "@/lib/shipping/metadataWriterLogger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET no permitido - solo POST
 */
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

/**
 * Mapea raw_status de Skydropx a mapped_status canónico
 */
function mapRawStatusToMappedStatus(rawStatus: string | null): string | null {
  if (!rawStatus) return null;

  const normalized = rawStatus.toLowerCase().trim();

  // created/label_created -> label_created
  if (normalized.includes("created") || normalized.includes("label_created")) {
    return "label_created";
  }

  // in_transit/shipped/picked_up/last_mile -> in_transit
  if (
    normalized.includes("in_transit") ||
    normalized.includes("shipped") ||
    normalized.includes("picked_up") ||
    normalized.includes("last_mile")
  ) {
    return "in_transit";
  }

  // delivered -> delivered (pero no delivered_to_branch)
  if (normalized.includes("delivered") && !normalized.includes("branch") && !normalized.includes("delivered_to")) {
    return "delivered";
  }

  // delivered_to_branch -> ready_for_pickup
  if (normalized.includes("delivered_to_branch") || normalized.includes("ready_for_pickup")) {
    return "ready_for_pickup";
  }

  // cancelled/canceled/in_return -> cancelled
  if (normalized.includes("cancelled") || normalized.includes("canceled") || normalized.includes("in_return")) {
    return "cancelled";
  }

  // exception/failed -> cancelled (tratado como cancelado)
  if (normalized.includes("exception") || normalized.includes("failed")) {
    return "cancelled";
  }

  // Intentar normalizar usando el helper genérico
  const normalizedHelper = normalizeShippingStatus(normalized);
  if (normalizedHelper && isValidShippingStatus(normalizedHelper)) {
    return normalizedHelper;
  }

  return null;
}

/**
 * Extrae datos del payload del webhook (formato JSON:API de Skydropx)
 */
function extractWebhookData(body: unknown): {
  providerEventId: string | null;
  shipmentId: string | null;
  rawStatus: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  occurredAt: string | null;
  payloadSafe: Record<string, unknown> | null;
} {
  if (!body || typeof body !== "object") {
    return {
      providerEventId: null,
      shipmentId: null,
      rawStatus: null,
      trackingNumber: null,
      labelUrl: null,
      occurredAt: null,
      payloadSafe: null,
    };
  }

  const payload = body as Record<string, unknown>;

  // Formato JSON:API de Skydropx: data.id, data.attributes, data.relationships
  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;
  const relationships = data?.relationships as Record<string, unknown> | undefined;
  const shipmentData = relationships?.shipment as Record<string, unknown> | undefined;
  const shipmentDataId = shipmentData?.data as Record<string, unknown> | undefined;

  // provider_event_id: data.id (ID del evento en Skydropx)
  const providerEventId = typeof data?.id === "string" ? data.id : null;

  // shipment_id: data.relationships.shipment.data.id
  const shipmentId =
    (typeof shipmentDataId?.id === "string" ? shipmentDataId.id : null) ||
    (typeof attributes?.shipment_id === "string" ? attributes.shipment_id : null) ||
    (typeof payload.shipment_id === "string" ? payload.shipment_id : null);

  // raw_status: data.attributes.status
  const rawStatus =
    (typeof attributes?.status === "string" ? attributes.status : null) ||
    (typeof payload.status === "string" ? payload.status : null);

  // tracking_number: data.attributes.tracking_number
  const trackingNumber =
    (typeof attributes?.tracking_number === "string" ? attributes.tracking_number : null) ||
    (typeof attributes?.trackingNumber === "string" ? attributes.trackingNumber : null) ||
    (typeof payload.tracking_number === "string" ? payload.tracking_number : null);

  // label_url: data.attributes.label_url o label_url_pdf
  const labelUrl =
    (typeof attributes?.label_url === "string" ? attributes.label_url : null) ||
    (typeof attributes?.label_url_pdf === "string" ? attributes.label_url_pdf : null) ||
    (typeof attributes?.labelUrl === "string" ? attributes.labelUrl : null) ||
    (typeof payload.label_url === "string" ? payload.label_url : null);

  // occurred_at: data.attributes.updated_at || created_at || now()
  const occurredAt =
    (typeof attributes?.updated_at === "string" ? attributes.updated_at : null) ||
    (typeof attributes?.created_at === "string" ? attributes.created_at : null) ||
    (typeof data?.attributes === "object" && data.attributes !== null
      ? ((data.attributes as Record<string, unknown>)?.updated_at as string | undefined) || null
      : null) ||
    null;

  // Payload seguro (sin PII): solo incluir campos no sensibles
  const payloadSafe: Record<string, unknown> = {
    event_id: providerEventId,
    shipment_id: shipmentId,
    status: rawStatus,
    has_tracking: !!trackingNumber,
    has_label: !!labelUrl,
    occurred_at: occurredAt,
    // NO incluir: direcciones completas, teléfonos, emails, nombres completos
  };

  return {
    providerEventId,
    shipmentId,
    rawStatus,
    trackingNumber,
    labelUrl,
    occurredAt,
    payloadSafe,
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
 * Resuelve la orden usando prioridad:
 * 1. shipping_shipment_id (columna) - PRIORITARIO
 * 2. metadata.shipping.shipment_id - FALLBACK
 * 3. tracking_number (columna) - FALLBACK
 * 4. metadata.shipping.tracking_number - FALLBACK LEGACY
 */
async function resolveOrder(
  supabase: ReturnType<typeof createClient<any, "public">>,
  shipmentId: string | null,
  trackingNumber: string | null,
): Promise<{ id: string; shipping_provider: string | null; shipping_tracking_number: string | null; shipping_shipment_id: string | null; shipping_label_url: string | null; metadata: Record<string, unknown> | null } | null> {
  // Prioridad 1: shipping_shipment_id (columna) - MATCHING PRIORITARIO
  if (shipmentId && shipmentId.trim().length > 0) {
    const trimmedShipmentId = shipmentId.trim();
    const { data, error, count } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number, shipping_shipment_id, shipping_label_url, metadata", { count: "exact" })
      .eq("shipping_shipment_id", trimmedShipmentId)
      .maybeSingle();

    if (error) {
      console.error("[skydropx/webhook] Error al buscar orden por shipping_shipment_id:", {
        shipmentId: trimmedShipmentId,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return null;
    }

    if (data) {
      console.log("[skydropx/webhook] Orden encontrada por shipping_shipment_id (columna):", {
        orderId: data.id,
        shipmentId: trimmedShipmentId,
        strategy: "shipping_shipment_id_column",
      });
      return data;
    }

    // Log diagnóstico: cuántas filas se encontraron con ese shipmentId
    if (count !== null && count !== undefined) {
      console.warn("[skydropx/webhook] Búsqueda por shipping_shipment_id no encontró match (count:", count, "):", {
        shipmentId: trimmedShipmentId,
        count,
      });
    }
  }

  // Prioridad 2: metadata.shipping.shipment_id - FALLBACK (solo si no se encontró por columna)
  // NOTA: Este fallback es menos eficiente (requiere filtrar JSON), pero es necesario para órdenes legacy
  if (shipmentId && shipmentId.trim().length > 0) {
    const trimmedShipmentId = shipmentId.trim();
    // Limitar búsqueda a órdenes con shipping_provider = skydropx para mejorar performance
    const { data: skydropxOrders, error } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number, shipping_shipment_id, shipping_label_url, metadata")
      .eq("shipping_provider", "skydropx")
      .not("metadata", "is", null)
      .limit(1000); // Limitar resultados para evitar cargar demasiadas órdenes

    if (error) {
      console.error("[skydropx/webhook] Error al buscar órdenes para metadata fallback:", {
        shipmentId: trimmedShipmentId,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return null;
    }

    // Filtrar en memoria por metadata.shipping.shipment_id
    const matchingOrder = skydropxOrders?.find((order) => {
      if (!order.metadata || typeof order.metadata !== "object") return false;
      const metadata = order.metadata as Record<string, unknown>;
      const shipping = metadata.shipping as Record<string, unknown> | undefined;
      const metaShipmentId = shipping?.shipment_id;
      return typeof metaShipmentId === "string" && metaShipmentId.trim() === trimmedShipmentId;
    });

    if (matchingOrder) {
      console.log("[skydropx/webhook] Orden encontrada por metadata.shipping.shipment_id (legacy):", {
        orderId: matchingOrder.id,
        shipmentId: trimmedShipmentId,
        strategy: "metadata_legacy",
      });
      return matchingOrder;
    }

    console.warn("[skydropx/webhook] Fallback legacy no encontró match:", {
      shipmentId: trimmedShipmentId,
      ordersScanned: skydropxOrders?.length || 0,
    });
  }

  // Prioridad 3: tracking_number (columna) - FALLBACK
  if (trackingNumber && trackingNumber.trim().length > 0) {
    const trimmedTrackingNumber = trackingNumber.trim();
    const { data, error, count } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number, shipping_shipment_id, shipping_label_url, metadata", { count: "exact" })
      .eq("shipping_tracking_number", trimmedTrackingNumber)
      .maybeSingle();

    if (error) {
      console.error("[skydropx/webhook] Error al buscar orden por tracking_number:", {
        trackingNumber: trimmedTrackingNumber,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return null;
    }

    if (data) {
      console.log("[skydropx/webhook] Orden encontrada por tracking_number (columna):", {
        orderId: data.id,
        trackingNumber: trimmedTrackingNumber,
        strategy: "tracking_number_column",
      });
      return data;
    }

    // Log diagnóstico
    if (count !== null && count !== undefined) {
      console.warn("[skydropx/webhook] Búsqueda por tracking_number no encontró match (count:", count, "):", {
        trackingNumber: trimmedTrackingNumber,
        count,
      });
    }
  }

  // Prioridad 4: metadata.shipping.tracking_number - FALLBACK LEGACY
  if (trackingNumber && trackingNumber.trim().length > 0) {
    const trimmedTrackingNumber = trackingNumber.trim();
    const { data: skydropxOrders, error } = await supabase
      .from("orders")
      .select("id, shipping_provider, shipping_tracking_number, shipping_shipment_id, shipping_label_url, metadata")
      .eq("shipping_provider", "skydropx")
      .not("metadata", "is", null)
      .limit(1000);

    if (error) {
      console.error("[skydropx/webhook] Error al buscar órdenes para tracking legacy:", {
        trackingNumber: trimmedTrackingNumber,
        errorCode: error.code,
        errorMessage: error.message,
      });
      return null;
    }

    const matchingOrder = skydropxOrders?.find((order) => {
      if (!order.metadata || typeof order.metadata !== "object") return false;
      const metadata = order.metadata as Record<string, unknown>;
      const shipping = metadata.shipping as Record<string, unknown> | undefined;
      const metaTrackingNumber = shipping?.tracking_number;
      return (
        typeof metaTrackingNumber === "string" &&
        metaTrackingNumber.trim() === trimmedTrackingNumber
      );
    });

    if (matchingOrder) {
      console.log("[skydropx/webhook] Orden encontrada por metadata.shipping.tracking_number:", {
        orderId: matchingOrder.id,
        trackingNumber: trimmedTrackingNumber,
        strategy: "metadata_tracking_number",
      });
      return matchingOrder;
    }

    console.warn("[skydropx/webhook] Fallback tracking legacy no encontró match:", {
      trackingNumber: trimmedTrackingNumber,
      ordersScanned: skydropxOrders?.length || 0,
    });
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Validar secret del webhook
    if (!validateWebhookSecret(req)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[skydropx/webhook] Webhook secret inválido o faltante");
      }
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

    // Extraer datos del payload JSON:API
    const { providerEventId, shipmentId, rawStatus, trackingNumber, labelUrl, occurredAt, payloadSafe } = extractWebhookData(body);

    // Mapear raw_status a mapped_status canónico
    const mappedStatus = mapRawStatusToMappedStatus(rawStatus);

    // Crear cliente Supabase con service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[skydropx/webhook] Configuración de Supabase incompleta");
      }
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

    // Buscar orden por shipping_shipment_id (matching confiable)
    const order = await resolveOrder(supabase, shipmentId, trackingNumber);

    if (!order) {
      console.warn("[skydropx/webhook] Orden no encontrada con los identificadores proporcionados:", {
        shipmentId: shipmentId || "null",
        trackingNumber: trackingNumber ? `${trackingNumber.substring(0, 8)}...` : "null",
        strategiesUsed: shipmentId
          ? ["shipping_shipment_id_column", "metadata_shipping_shipment_id"]
          : [],
      });
      return NextResponse.json({ received: true, message: "No matching order" });
    }

    // Solo actualizar si es una orden de Skydropx
    if (order.shipping_provider !== "skydropx" && order.shipping_provider !== "Skydropx") {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[skydropx/webhook] Orden no es de Skydropx, ignorando:", {
          orderId: order.id,
          provider: order.shipping_provider,
        });
      }
      return NextResponse.json({ received: true, message: "Order not from Skydropx" });
    }

    // Construir provider_event_id determinístico si no existe (para idempotencia)
    // Usar shipment_id + raw_status + occurred_at (o timestamp actual) para crear un ID único
    const finalProviderEventId =
      providerEventId ||
      (shipmentId && rawStatus
        ? `${shipmentId}_${rawStatus}_${occurredAt || new Date().toISOString()}`
        : null);

    // Insertar evento en shipping_events (idempotente por provider + provider_event_id)
    // Solo insertar si tenemos al menos shipment_id + raw_status para construir un ID determinístico
    if (finalProviderEventId) {
      const occurredAtParsed = occurredAt ? new Date(occurredAt) : new Date();

      // Verificar si el evento ya existe (idempotencia)
      const { data: existingEvent } = await supabase
        .from("shipping_events")
        .select("id")
        .eq("provider", "skydropx")
        .eq("provider_event_id", finalProviderEventId)
        .maybeSingle();

      // Solo insertar si no existe
      if (!existingEvent) {
        const { error: eventInsertError } = await supabase
          .from("shipping_events")
          .insert({
            order_id: order.id,
            provider: "skydropx",
            provider_event_id: finalProviderEventId,
            raw_status: rawStatus,
            mapped_status: mappedStatus,
            tracking_number: trackingNumber,
            label_url: labelUrl,
            payload: payloadSafe,
            occurred_at: occurredAtParsed.toISOString(),
          });

        // Manejar errores de inserción (incluyendo unique constraint)
        if (eventInsertError) {
          if (eventInsertError.code === "23505" || eventInsertError.message.includes("duplicate") || eventInsertError.message.includes("unique")) {
            if (process.env.NODE_ENV !== "production") {
              console.log("[skydropx/webhook] Evento ya procesado (idempotencia):", {
                orderId: order.id,
                providerEventId: finalProviderEventId,
              });
            }
            // Evento duplicado es OK, continuar con actualización si es necesario
          } else {
            // Otro error: loguear pero continuar (podría ser problema de conexión)
            if (process.env.NODE_ENV !== "production") {
              console.warn("[skydropx/webhook] Error al insertar evento (continuando):", {
                orderId: order.id,
                providerEventId: finalProviderEventId,
                error: eventInsertError.message,
                code: eventInsertError.code,
              });
            }
          }
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.log("[skydropx/webhook] Evento nuevo registrado:", {
              orderId: order.id,
              providerEventId: finalProviderEventId,
              rawStatus,
              mappedStatus,
            });
          }
        }
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.log("[skydropx/webhook] Evento ya procesado (idempotencia, verificación previa):", {
            orderId: order.id,
            providerEventId: finalProviderEventId,
          });
        }
      }
    } else if (process.env.NODE_ENV !== "production") {
      console.warn("[skydropx/webhook] No se puede construir provider_event_id determinístico, omitiendo evento:", {
        orderId: order.id,
        shipmentId,
        rawStatus,
      });
    }

    // Actualizar orden solo si mapped_status es válido
    if (mappedStatus && isValidShippingStatus(mappedStatus)) {
      const updateData: Record<string, unknown> = {
        shipping_status: mappedStatus,
        updated_at: new Date().toISOString(),
      };

      // Si viene tracking_number y es diferente del actual (o no existe), actualizarlo
      // NO sobreescribir valores existentes con null
      if (trackingNumber && trackingNumber.trim().length > 0 && trackingNumber.trim() !== order.shipping_tracking_number) {
        updateData.shipping_tracking_number = trackingNumber.trim();
      }

      // Si viene label_url y es diferente del actual (o no existe), actualizarlo
      // NO sobreescribir valores existentes con null
      if (labelUrl && labelUrl.trim().length > 0 && labelUrl.trim() !== order.shipping_label_url) {
        updateData.shipping_label_url = labelUrl.trim();
      }

      // Si viene shipment_id y la orden no tiene uno en columna, setearlo
      if (shipmentId && !order.shipping_shipment_id) {
        updateData.shipping_shipment_id = shipmentId.trim();
        
        // También actualizar metadata.shipping.shipment_id por consistencia
        const { data: fullOrder } = await supabase
          .from("orders")
          .select("metadata")
          .eq("id", order.id)
          .single();

        if (fullOrder?.metadata) {
          const currentMetadata = fullOrder.metadata as Record<string, unknown>;
          const shippingMeta = (currentMetadata.shipping as Record<string, unknown>) || {};
          
          // CRÍTICO: Releer metadata justo antes del update para evitar race conditions
          const { data: freshOrder } = await supabase
            .from("orders")
            .select("metadata, updated_at")
            .eq("id", order.id)
            .single();
          
          const freshMetadata = (freshOrder?.metadata as Record<string, unknown>) || {};
          const freshUpdatedAt = freshOrder?.updated_at as string | null | undefined;
          const freshShippingMeta = (freshMetadata.shipping as Record<string, unknown>) || {};
          
          // Merge seguro: preservar rate_used de freshMetadata y agregar shipment_id
          const updatedShippingMeta = {
            ...shippingMeta,
            shipment_id: shipmentId.trim(),
          };
          const mergedShippingMeta = {
            ...(freshShippingMeta || {}),
            ...updatedShippingMeta,
          };
          
          const mergedMetadata: Record<string, unknown> = {
            ...freshMetadata,
            shipping: mergedShippingMeta,
          };
          
          // Normalizar metadata antes de persistir para asegurar rate_used completo
          const normalizedMeta = normalizeShippingMetadata(mergedMetadata, {
            source: "admin",
            orderId: order.id,
          });
          
          // Usar SOLO el resultado normalizado (nunca mezclar con updatedMetadata)
          const metadataWithPricing: Record<string, unknown> = {
            ...mergedMetadata,
            ...(normalizedMeta.shippingPricing ? { shipping_pricing: normalizedMeta.shippingPricing } : {}),
          };
          
          const normalizedWithDebug = {
            ...metadataWithPricing,
            shipping: addShippingMetadataDebug(normalizedMeta.shippingMeta, "webhook-skydropx", metadataWithPricing),
          };
          
          // Aplicar preserveRateUsed para garantizar que rate_used nunca quede null
          const finalMetadataWithPreserve = preserveRateUsed(freshMetadata, normalizedWithDebug);
          
          // CRÍTICO: Asegurar que rate_used esté presente en el payload final antes de escribir
          const finalMetadata = ensureRateUsedInMetadata(finalMetadataWithPreserve);
          
          // INSTRUMENTACIÓN PRE-WRITE
          logPreWrite("webhook-skydropx", order.id, freshMetadata, freshUpdatedAt, finalMetadata);
          
          updateData.metadata = finalMetadata;
        }
      }

      // Actualizar orden con return=representation
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", order.id)
        .select("id, metadata, updated_at")
        .single();
      
      // INSTRUMENTACIÓN POST-WRITE
      if (updateData.metadata && updatedOrder) {
        const postWriteMetadata = (updatedOrder.metadata as Record<string, unknown>) || {};
        const postWriteUpdatedAt = updatedOrder.updated_at as string | null | undefined;
        logPostWrite("webhook-skydropx", order.id, postWriteMetadata, postWriteUpdatedAt);
      }

      if (updateError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[skydropx/webhook] Error al actualizar orden:", {
            orderId: order.id,
            error: updateError,
          });
        }
        // Continuar y responder 200 aunque falle el update (evento ya persistido)
      } else {
        if (process.env.NODE_ENV !== "production") {
          console.log("[skydropx/webhook] Orden actualizada:", {
            orderId: order.id,
            rawStatus,
            mappedStatus,
            trackingNumber: trackingNumber || "no actualizado",
            shipmentId: shipmentId || "no proporcionado",
          });
        }
      }
    } else {
      // Si no se puede mapear, aún así respondemos 200 (evento recibido y guardado)
      if (process.env.NODE_ENV !== "production") {
        console.warn("[skydropx/webhook] Evento recibido pero no mapeado a shipping_status:", {
          orderId: order.id,
          rawStatus,
          shipmentId,
        });
      }
    }

    // Siempre responder 200 para evitar reenvíos
    return NextResponse.json({
      received: true,
      message: "ok",
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[skydropx/webhook] Error inesperado:", error);
    }
    // Responder 200 para evitar reenvíos por parte de Skydropx
    return NextResponse.json(
      { received: true, message: "Error processing event", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 200 },
    );
  }
}
