import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { getShipment, type SkydropxShipmentResponse } from "@/lib/skydropx/client";
import { isValidShippingStatus } from "@/lib/orders/statuses";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SyncLabelRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
});

type SyncLabelResponse =
  | {
      ok: true;
      trackingNumber?: string | null;
      labelUrl?: string | null;
      updated: boolean;
      message: string;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid_order_id"
        | "order_not_found"
        | "missing_shipment_id"
        | "skydropx_error"
        | "skydropx_not_found"
        | "skydropx_unauthorized"
        | "config_error"
        | "unknown_error";
      message: string;
      statusCode?: number;
      details?: unknown;
    };

/**
 * Extrae tracking_number y label_url desde included packages (JSON:API)
 * Prioriza el primer package con ambos campos no vacíos
 */
function extractTrackingAndLabelFromPackages(
  response: SkydropxShipmentResponse,
): { trackingNumber: string | null; labelUrl: string | null; strategy: string } {
  const anyResponse = response as any;

  // Estrategia 1: Buscar en included packages (JSON:API) - PRIORITARIO
  if (response.included && Array.isArray(response.included)) {
    // Buscar el mejor candidato: package con tracking_number Y label_url no vacíos
    const bestPackage = response.included.find((pkg: any) => {
      const hasTracking = pkg.tracking_number && typeof pkg.tracking_number === "string" && pkg.tracking_number.trim().length > 0;
      const hasLabel = pkg.label_url && typeof pkg.label_url === "string" && pkg.label_url.trim().length > 0;
      return hasTracking && hasLabel;
    });

    if (bestPackage) {
      return {
        trackingNumber: bestPackage.tracking_number || null,
        labelUrl: bestPackage.label_url || null,
        strategy: "included_packages_best",
      };
    }

    // Si no hay package con ambos, buscar el primero con tracking_number
    const packageWithTracking = response.included.find((pkg: any) => {
      return pkg.tracking_number && typeof pkg.tracking_number === "string" && pkg.tracking_number.trim().length > 0;
    });

    // Y el primero con label_url
    const packageWithLabel = response.included.find((pkg: any) => {
      return pkg.label_url && typeof pkg.label_url === "string" && pkg.label_url.trim().length > 0;
    });

    if (packageWithTracking || packageWithLabel) {
      return {
        trackingNumber: packageWithTracking?.tracking_number || null,
        labelUrl: packageWithLabel?.label_url || null,
        strategy: "included_packages_separate",
      };
    }
  }

  // Estrategia 2: Buscar en response directo
  const trackingNumber =
    response.master_tracking_number ||
    anyResponse.data?.master_tracking_number ||
    anyResponse.tracking_number ||
    anyResponse.data?.tracking_number ||
    anyResponse.tracking ||
    null;

  const labelUrl =
    anyResponse.label_url ||
    anyResponse.data?.label_url ||
    anyResponse.label_url_pdf ||
    anyResponse.files?.label ||
    null;

  if (trackingNumber || labelUrl) {
    return {
      trackingNumber: typeof trackingNumber === "string" ? trackingNumber.trim() : null,
      labelUrl: typeof labelUrl === "string" ? labelUrl.trim() : null,
      strategy: "response_direct",
    };
  }

  // Estrategia 3: Buscar en response.shipment
  if (anyResponse.shipment) {
    const shipmentTracking =
      anyResponse.shipment.tracking_number ||
      anyResponse.shipment.master_tracking_number ||
      null;
    const shipmentLabel = anyResponse.shipment.label_url || null;

    if (shipmentTracking || shipmentLabel) {
      return {
        trackingNumber: typeof shipmentTracking === "string" ? shipmentTracking.trim() : null,
        labelUrl: typeof shipmentLabel === "string" ? shipmentLabel.trim() : null,
        strategy: "response_shipment",
      };
    }
  }

  return {
    trackingNumber: null,
    labelUrl: null,
    strategy: "none",
  };
}

export async function POST(req: NextRequest) {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "No tienes permisos para realizar esta acción",
        } satisfies SyncLabelResponse,
        { status: 403 },
      );
    }

    // Validar body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_order_id",
          message: "Datos inválidos: se espera un objeto JSON",
        } satisfies SyncLabelResponse,
        { status: 400 },
      );
    }

    // Validar con Zod
    const validationResult = SyncLabelRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_order_id",
          message: `Datos inválidos: ${errors}`,
        } satisfies SyncLabelResponse,
        { status: 400 },
      );
    }

    const { orderId } = validationResult.data;

    // Crear cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Supabase incompleta",
        } satisfies SyncLabelResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Cargar la orden
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status, shipping_provider, metadata")
      .eq("id", orderId)
      .single();

    if (orderError || !orderData) {
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "La orden no existe",
        } satisfies SyncLabelResponse,
        { status: 404 },
      );
    }

    // Leer shipping_shipment_id de la columna (PRIORITARIO) o metadata (fallback)
    const shipmentId = (orderData.shipping_shipment_id as string) || null;

    // Fallback: leer de metadata si no está en la columna
    let shipmentIdFromMeta: string | null = null;
    if (!shipmentId) {
      const metadata = (orderData.metadata as Record<string, unknown>) || {};
      const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
      shipmentIdFromMeta = (shippingMeta.shipment_id as string) || null;
    }

    const finalShipmentId = shipmentId || shipmentIdFromMeta;

    if (!finalShipmentId) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipment_id",
          message: "La orden no tiene shipment_id guardado. Crea la guía primero.",
        } satisfies SyncLabelResponse,
        { status: 400 },
      );
    }

    // Obtener shipment desde Skydropx
    const shipmentResponse = await getShipment(finalShipmentId);

    // Extraer tracking y label desde packages (JSON:API)
    const { trackingNumber: extractedTracking, labelUrl: extractedLabel, strategy: extractionStrategy } =
      extractTrackingAndLabelFromPackages(shipmentResponse);

    // Logs de diagnóstico (sin PII)
    const packagesCount = Array.isArray((shipmentResponse as any).included) ? (shipmentResponse as any).included.length : 0;
    const foundTracking = !!extractedTracking;
    const foundLabel = !!extractedLabel;

    console.log("[sync-label] Datos extraídos de Skydropx:", {
      shipmentId: finalShipmentId,
      packagesCount,
      foundTracking,
      foundLabel,
      strategyUsed: extractionStrategy,
    });

    // Determinar si hay cambios (solo tracking/label, NO null sobreescribe existentes)
    const hasTrackingChange = extractedTracking && extractedTracking.trim().length > 0 && extractedTracking !== orderData.shipping_tracking_number;
    const hasLabelChange = extractedLabel && extractedLabel.trim().length > 0 && extractedLabel !== orderData.shipping_label_url;
    const hasShipmentIdChange = finalShipmentId && finalShipmentId !== orderData.shipping_shipment_id;
    const hasChanges = hasTrackingChange || hasLabelChange || hasShipmentIdChange;

    // Actualizar metadata si shipmentId viene de metadata (para consistencia)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Guardar shipment_id en columna dedicada (SIEMPRE si no está)
    if (finalShipmentId && !orderData.shipping_shipment_id) {
      updateData.shipping_shipment_id = finalShipmentId;

      // También actualizar metadata.shipping.shipment_id por consistencia
      const metadata = (orderData.metadata as Record<string, unknown>) || {};
      const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
      const updatedShippingMeta = {
        ...shippingMeta,
        shipment_id: finalShipmentId,
      };
      updateData.metadata = {
        ...metadata,
        shipping: updatedShippingMeta,
      };
    }

    // Actualizar tracking/label solo si hay cambios Y el nuevo valor no es null/empty
    // NO sobreescribir valores existentes con null
    if (hasTrackingChange) {
      updateData.shipping_tracking_number = extractedTracking!.trim();
    }
    if (hasLabelChange) {
      updateData.shipping_label_url = extractedLabel!.trim();
    }

    // Actualizar shipping_status según disponibilidad de tracking/label
    const finalTracking = extractedTracking || orderData.shipping_tracking_number;
    const finalLabel = extractedLabel || orderData.shipping_label_url;

    if (finalTracking && finalLabel) {
      updateData.shipping_status = "label_created";
    } else if (finalTracking || finalLabel) {
      updateData.shipping_status = "label_pending_tracking";
    } else if (finalShipmentId && !orderData.shipping_tracking_number && !orderData.shipping_label_url) {
      // Si hay shipment_id pero no tracking/label aún, mantener como pendiente
      updateData.shipping_status = "label_pending_tracking";
    }

    // Solo actualizar si hay cambios reales
    if (Object.keys(updateData).length > 1 || hasChanges) {
      // Si solo hay updated_at, no actualizar (evitar updates innecesarios)
      const hasRealChanges = hasChanges || (updateData.shipping_shipment_id && !orderData.shipping_shipment_id);
      if (hasRealChanges) {
        await supabase.from("orders").update(updateData).eq("id", orderId);
      }
    }

    // Insertar evento en shipping_events si hay tracking/label nuevos (idempotente)
    if ((hasTrackingChange || hasLabelChange) && finalShipmentId) {
      // Construir provider_event_id determinístico para sync-label
      const syncTimestamp = new Date().toISOString();
      const providerEventId = `sync-${finalShipmentId}-${syncTimestamp}`;

      // Verificar si el evento ya existe (idempotencia)
      const { data: existingEvent } = await supabase
        .from("shipping_events")
        .select("id")
        .eq("provider", "skydropx")
        .eq("provider_event_id", providerEventId)
        .maybeSingle();

      // Solo insertar si no existe
      if (!existingEvent) {
        // Determinar raw_status y mapped_status según disponibilidad
        const rawStatus = finalTracking && finalLabel ? "label_created" : finalTracking || finalLabel ? "tracking_pending" : "pending";
        const mappedStatus = finalTracking && finalLabel ? "label_created" : "label_pending_tracking";

        const { error: eventInsertError } = await supabase.from("shipping_events").insert({
          order_id: orderId,
          provider: "skydropx",
          provider_event_id: providerEventId,
          raw_status: rawStatus,
          mapped_status: mappedStatus,
          tracking_number: extractedTracking,
          label_url: extractedLabel,
          payload: {
            source: "sync-label",
            shipment_id: finalShipmentId,
            has_tracking: !!extractedTracking,
            has_label: !!extractedLabel,
          },
          occurred_at: syncTimestamp,
        });

        if (eventInsertError) {
          // Si es unique constraint, ignorar (idempotencia)
          if (eventInsertError.code !== "23505" && !eventInsertError.message.includes("duplicate")) {
            console.error("[sync-label] Error al insertar evento:", {
              orderId,
              errorCode: eventInsertError.code,
              errorMessage: eventInsertError.message,
            });
          }
        } else {
          console.log("[sync-label] Evento insertado en shipping_events:", {
            orderId,
            providerEventId,
            hasTracking: !!extractedTracking,
            hasLabel: !!extractedLabel,
          });
        }
      }
    }

    // Construir mensaje descriptivo
    let message = "";
    if (!hasChanges && !hasShipmentIdChange) {
      message = "No hay cambios. La orden ya tiene los datos más recientes.";
    } else if (hasTrackingChange && hasLabelChange) {
      message = "Tracking y etiqueta actualizados exitosamente.";
    } else if (hasTrackingChange) {
      message = "Tracking actualizado exitosamente.";
    } else if (hasLabelChange) {
      message = "Etiqueta actualizada exitosamente.";
    } else if (hasShipmentIdChange) {
      message = "Shipment ID guardado.";
    } else {
      message = "Actualización completada.";
    }

    const finalUpdated = !!(hasChanges || hasShipmentIdChange);

    return NextResponse.json({
      ok: true,
      trackingNumber: extractedTracking || orderData.shipping_tracking_number || null,
      labelUrl: extractedLabel || orderData.shipping_label_url || null,
      updated: finalUpdated,
      message,
    } satisfies SyncLabelResponse);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[sync-label] Error inesperado:", error);
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    const errorCode = (error as Error & { code?: string }).code;
    const statusCode = (error as Error & { statusCode?: number }).statusCode;

    // Detectar errores específicos de Skydropx
    const isSkydropxError =
      errorMessage.includes("Skydropx") ||
      errorCode === "skydropx_not_found" ||
      errorCode === "skydropx_unauthorized" ||
      statusCode === 404 ||
      statusCode === 401 ||
      statusCode === 403;

    if (isSkydropxError) {
      const skydropxCode: Extract<SyncLabelResponse, { ok: false }>["code"] =
        statusCode === 404 || errorCode === "skydropx_not_found"
          ? "skydropx_not_found"
          : statusCode === 401 || statusCode === 403 || errorCode === "skydropx_unauthorized"
            ? "skydropx_unauthorized"
            : "skydropx_error";

      return NextResponse.json(
        {
          ok: false,
          code: skydropxCode,
          message: errorMessage,
          statusCode: statusCode || undefined,
        } satisfies SyncLabelResponse,
        {
          status: statusCode === 404 ? 404 : statusCode === 401 || statusCode === 403 ? 401 : statusCode || 500,
        },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: errorMessage,
        statusCode: statusCode || undefined,
      } satisfies SyncLabelResponse,
      { status: statusCode || 500 },
    );
  }
}
