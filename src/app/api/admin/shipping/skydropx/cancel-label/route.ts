import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { skydropxFetch, getSkydropxConfig } from "@/lib/skydropx/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CancelLabelRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
});

type CancelLabelResponse =
  | {
      ok: true;
      message: string;
      diagnostic?: {
        has_shipment_id: boolean;
        has_tracking: boolean;
        has_label_url: boolean;
      };
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid_order_id"
        | "order_not_found"
        | "no_label_created"
        | "missing_shipment_id"
        | "skydropx_error"
        | "config_error"
        | "unknown_error";
      message: string;
      diagnostic?: {
        has_shipment_id: boolean;
        has_tracking: boolean;
        has_label_url: boolean;
      };
    };

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
        } satisfies CancelLabelResponse,
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
        } satisfies CancelLabelResponse,
        { status: 400 },
      );
    }

    // Validar con Zod
    const validationResult = CancelLabelRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_order_id",
          message: `Datos inválidos: ${errors}`,
        } satisfies CancelLabelResponse,
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
        } satisfies CancelLabelResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Cargar la orden (incluir shipping_shipment_id y metadata)
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status, shipping_provider, metadata")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[cancel-label] Orden no encontrada:", { orderId, error: orderError });
      }
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "La orden no existe",
        } satisfies CancelLabelResponse,
        { status: 404 },
      );
    }

    // Obtener shipment_id con prioridad: columna shipping_shipment_id, luego metadata (legacy)
    const shipmentIdColumn = (order.shipping_shipment_id as string) || null;
    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const shippingMeta = (currentMetadata.shipping as Record<string, unknown>) || {};
    const shipmentIdFromMeta = (shippingMeta.shipment_id as string) || null;
    const shipmentId = shipmentIdColumn || shipmentIdFromMeta;

    // Construir diagnóstico sin PII
    const diagnostic = {
      has_shipment_id: !!shipmentId,
      has_tracking: !!order.shipping_tracking_number,
      has_label_url: !!order.shipping_label_url,
    };

    // IDEMPOTENCIA: Si ya está cancelado, retornar éxito sin repetir
    if (order.shipping_status === "cancelled" || order.shipping_status === "cancel_requested") {
      return NextResponse.json(
        {
          ok: true,
          message:
            order.shipping_status === "cancelled"
              ? "El envío ya está cancelado"
              : "La solicitud de cancelación ya está en proceso",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 200 },
      );
    }

    // Verificar evidencia de guía creada: requiere shipment_id (REQUERIDO para cancelar)
    // Si hay tracking/label pero NO shipment_id, requerir sincronización primero
    if (!shipmentId && order.shipping_tracking_number) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[cancel-label] Falta shipment_id pero hay tracking:", {
          orderId,
          hasTracking: !!order.shipping_tracking_number,
          hasLabelUrl: !!order.shipping_label_url,
        });
      }

      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipment_id",
          message:
            "La orden tiene tracking pero falta shipment_id. Sincroniza la guía primero usando 'Sincronizar guía' para poder cancelar el envío.",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 400 },
      );
    }

    // Si no tiene shipment_id y tampoco tiene tracking/label, no se puede cancelar
    if (!shipmentId && !order.shipping_tracking_number && !order.shipping_label_url) {
      return NextResponse.json(
        {
          ok: false,
          code: "no_label_created",
          message: "La orden no tiene una guía creada para cancelar",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 400 },
      );
    }
    // Skydropx no tiene endpoint de lookup por tracking, así que debemos requerir shipment_id
    if (!shipmentId && order.shipping_tracking_number) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[cancel-label] Falta shipment_id pero hay tracking:", {
          orderId,
          hasTracking: !!order.shipping_tracking_number,
          hasLabelUrl: !!order.shipping_label_url,
        });
      }

      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipment_id",
          message:
            "La orden tiene tracking pero falta shipment_id. Sincroniza la guía primero usando 'Sincronizar guía' para poder cancelar el envío.",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 400 },
      );
    }

    // Si no tiene shipment_id y tampoco tiene tracking, no se puede cancelar
    if (!shipmentId && !order.shipping_tracking_number) {
      return NextResponse.json(
        {
          ok: false,
          code: "no_label_created",
          message: "La orden no tiene una guía creada para cancelar",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 400 },
      );
    }

    // Cancelar realmente en Skydropx usando el endpoint correcto
    if (!shipmentId) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipment_id",
          message: "La orden no tiene shipment_id. No se puede cancelar el envío en Skydropx.",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 400 },
      );
    }

    // Obtener configuración de Skydropx para usar la base URL correcta
    const skydropxConfig = getSkydropxConfig();
    if (!skydropxConfig) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Skydropx no está configurado",
        } satisfies CancelLabelResponse,
        { status: 500 },
      );
    }

    // Tipo para respuesta de cancelación de Skydropx
    type CancelResponse = {
      id?: string;
      data?: { id?: string; attributes?: { id?: string; status?: string } };
      attributes?: { id?: string; status?: string };
    };

    // Skydropx API: POST /api/v1/shipments/{shipment_id}/cancellations
    const cancelPath = `/api/v1/shipments/${shipmentId}/cancellations`;
    const cancelPayload = {
      reason: "Cancelado desde admin DDN",
      shipment_id: shipmentId,
    };

    // Log seguro (sin PII)
    if (process.env.NODE_ENV !== "production") {
      console.log("[cancel-label] Cancelando shipment en Skydropx:", {
        shipmentId: shipmentId.substring(0, 8) + "...", // Solo primeros 8 chars
        path: cancelPath,
        baseUrl: skydropxConfig.restBaseUrl,
      });
    }

    let cancelResponseData: CancelResponse | null = null;
    let skydropxCancelSuccess = false;

    try {
      const response = await skydropxFetch(cancelPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cancelPayload),
      });

      if (response.ok) {
        skydropxCancelSuccess = true;
        cancelResponseData = (await response.json()) as CancelResponse;

        // Log seguro
        if (process.env.NODE_ENV !== "production") {
          console.log("[cancel-label] Shipment cancelado exitosamente en Skydropx:", {
            shipmentId: shipmentId.substring(0, 8) + "...",
            status: response.status,
            cancelId: cancelResponseData?.id || cancelResponseData?.data?.id || cancelResponseData?.data?.attributes?.id || null,
          });
        }
      } else {
        // Si Skydropx responde error, NO marcar como cancelado localmente
        const errorText = await response.text();
        let errorBody: unknown = null;
        try {
          errorBody = JSON.parse(errorText);
        } catch {
          errorBody = errorText.substring(0, 200);
        }

        // Log seguro del error
        console.warn("[cancel-label] Error cancelando shipment en Skydropx:", {
          shipmentId: shipmentId.substring(0, 8) + "...",
          status: response.status,
          statusText: response.statusText,
          baseUrl: skydropxConfig.restBaseUrl,
          path: cancelPath,
          errorSnippet: typeof errorBody === "string" ? errorBody : JSON.stringify(errorBody).substring(0, 200),
        });

        // Determinar código de error según status (todos los errores de Skydropx usan "skydropx_error")
        const errorCode: Extract<CancelLabelResponse, { ok: false }>["code"] = "skydropx_error";

        const errorMessage =
          response.status === 404
            ? "El shipment no existe en Skydropx o ya fue cancelado"
            : response.status === 422
              ? "El shipment no se puede cancelar (puede estar en tránsito o ya entregado)"
              : `Error al cancelar en Skydropx: ${response.statusText || `HTTP ${response.status}`}`;

        return NextResponse.json(
          {
            ok: false,
            code: errorCode,
            message: errorMessage,
            diagnostic,
          } satisfies CancelLabelResponse,
          { status: response.status >= 400 && response.status < 500 ? response.status : 500 },
        );
      }
    } catch (skydropxError) {
      // Si falla la llamada a Skydropx, NO marcar como cancelado localmente
      const errorMessage = skydropxError instanceof Error ? skydropxError.message : String(skydropxError);

      console.error("[cancel-label] Error inesperado al cancelar shipment en Skydropx:", {
        shipmentId: shipmentId.substring(0, 8) + "...",
        baseUrl: skydropxConfig.restBaseUrl,
        path: cancelPath,
        error: errorMessage,
      });

      return NextResponse.json(
        {
          ok: false,
          code: "skydropx_error",
          message: `Error al cancelar en Skydropx: ${errorMessage}`,
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 500 },
      );
    }

    // Solo actualizar localmente si Skydropx respondió OK
    if (!skydropxCancelSuccess) {
      return NextResponse.json(
        {
          ok: false,
          code: "skydropx_error",
          message: "No se pudo cancelar el shipment en Skydropx",
          diagnostic,
        } satisfies CancelLabelResponse,
        { status: 500 },
      );
    }

    // Extraer información de la respuesta de cancelación
    const cancelId =
      cancelResponseData?.id ||
      cancelResponseData?.data?.id ||
      cancelResponseData?.data?.attributes?.id ||
      cancelResponseData?.attributes?.id ||
      null;
    const cancelStatus = cancelResponseData?.data?.attributes?.status || cancelResponseData?.attributes?.status || "cancelled";

    // Merge seguro de metadata (NO sobreescribir completo)
    const updatedShippingMeta = {
      ...shippingMeta, // Preservar datos existentes
      shipment_id: shipmentId, // Asegurar shipment_id
      cancel_reason: "Cancelado desde admin DDN",
      canceled_at: new Date().toISOString(),
      ...(cancelId && { cancel_response_id: cancelId }), // Agregar cancel_response_id si existe
      cancel_status: cancelStatus,
    };

    const updatedMetadata = {
      ...currentMetadata, // Preservar todos los campos existentes
      shipping: updatedShippingMeta,
    };

    // Actualizar la orden localmente: estado = "cancelled" (solo si Skydropx respondió OK)
    // Conservar tracking/label para referencia histórica, pero marcar como cancelado
    const updateData: Record<string, unknown> = {
      shipping_status: "cancelled", // Marcar como cancelado
      metadata: updatedMetadata, // Merge seguro de metadata (incluye cancel_response_id, cancel_status)
      updated_at: new Date().toISOString(),
    };

    // Asegurar que shipping_shipment_id esté guardado en la columna si no estaba
    if (shipmentId && !shipmentIdColumn) {
      updateData.shipping_shipment_id = shipmentId;
    }

    const { error: updateError } = await supabase.from("orders").update(updateData).eq("id", orderId);

    if (updateError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[cancel-label] Error actualizando orden:", updateError);
      }
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "Error al actualizar el estado de la orden",
        } satisfies CancelLabelResponse,
        { status: 500 },
      );
    }

    // Insertar evento en shipping_events (idempotente)
    if (shipmentId) {
      const eventTimestamp = new Date().toISOString();
      const providerEventId = `cancel-${shipmentId}-${Date.now()}`;

      // Verificar si el evento ya existe (idempotencia)
      const { data: existingEvent } = await supabase
        .from("shipping_events")
        .select("id")
        .eq("provider", "skydropx")
        .eq("provider_event_id", providerEventId)
        .maybeSingle();

      // Solo insertar si no existe
      if (!existingEvent) {
        const { error: eventInsertError } = await supabase.from("shipping_events").insert({
          order_id: orderId,
          provider: "skydropx",
          provider_event_id: providerEventId,
          raw_status: "cancelled",
          mapped_status: "cancelled",
          tracking_number: order.shipping_tracking_number,
          label_url: order.shipping_label_url,
          payload: {
            source: "cancel-label-endpoint",
            shipment_id: shipmentId,
            cancel_id: cancelId,
            cancel_status: cancelStatus,
            canceled_at: eventTimestamp,
          },
          occurred_at: eventTimestamp,
        });

        if (eventInsertError) {
          // Si es unique constraint, ignorar (idempotencia)
          if (eventInsertError.code !== "23505" && !eventInsertError.message.includes("duplicate")) {
            console.error("[cancel-label] Error al insertar evento de cancelación:", {
              orderId,
              providerEventId,
              errorCode: eventInsertError.code,
              errorMessage: eventInsertError.message,
            });
          }
        } else {
          if (process.env.NODE_ENV !== "production") {
            console.log("[cancel-label] Evento de cancelación insertado:", {
              orderId,
              providerEventId,
            });
          }
        }
      }
    }

    // Log seguro de éxito
    if (process.env.NODE_ENV !== "production") {
      console.log("[cancel-label] Envío cancelado exitosamente:", {
        orderId,
        shipmentId: shipmentId.substring(0, 8) + "...",
        cancelId,
        cancelStatus,
        diagnostic,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Envío cancelado exitosamente en Skydropx",
      diagnostic,
    } satisfies CancelLabelResponse);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[cancel-label] Error inesperado:", error);
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: errorMessage,
      } satisfies CancelLabelResponse,
      { status: 500 },
    );
  }
}

