import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { skydropxFetch } from "@/lib/skydropx/client";

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

    // Cargar la orden
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
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

    // Obtener shipment_id de metadata para verificar evidencia de guía creada
    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const shippingMeta = (currentMetadata.shipping as Record<string, unknown>) || {};
    const shipmentId = (shippingMeta.shipment_id as string) || null;

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

    let cancelRequestId: string | null = null;
    let cancelStatus: string | null = null;

    // Intentar crear cancel request en Skydropx si tenemos shipment_id
    if (shipmentId) {
      try {
        // Skydropx API: POST /v1/cancel_label_requests (modelo cancel request)
        const cancelPayload = {
          shipment_id: shipmentId,
          reason: "Cliente solicitó cancelación",
        };

        if (process.env.NODE_ENV !== "production") {
          console.log("[cancel-label] Creando cancel request en Skydropx:", {
            shipmentId,
            url: "/v1/cancel_label_requests",
          });
        }

        const response = await skydropxFetch("/v1/cancel_label_requests", {
          method: "POST",
          body: JSON.stringify(cancelPayload),
        });

        if (response.ok) {
          const cancelResponse = (await response.json()) as {
            id?: string;
            data?: { id?: string };
            attributes?: { status?: string; id?: string };
          };

          // Extraer cancel_request_id
          cancelRequestId =
            cancelResponse.id ||
            cancelResponse.data?.id ||
            cancelResponse.attributes?.id ||
            null;

          // Extraer status inicial (puede ser "reviewing", "pending", etc.)
          cancelStatus = cancelResponse.attributes?.status || "reviewing";

          if (process.env.NODE_ENV !== "production") {
            console.log("[cancel-label] Cancel request creado en Skydropx:", {
              cancelRequestId,
              cancelStatus,
            });
          }
        } else {
          // Si falla, puede ser que ya existe o que el shipment no se puede cancelar
          const errorText = await response.text();
          if (process.env.NODE_ENV !== "production") {
            console.warn("[cancel-label] Error creando cancel request en Skydropx:", {
              shipmentId,
              status: response.status,
              error: errorText,
            });
          }
          // Continuar con actualización local aunque falle en Skydropx
        }
      } catch (skydropxError) {
        // Si falla la cancelación en Skydropx, continuar con la actualización local
        if (process.env.NODE_ENV !== "production") {
          console.warn("[cancel-label] Error al crear cancel request en Skydropx (continuando localmente):", {
            shipmentId,
            error: skydropxError instanceof Error ? skydropxError.message : String(skydropxError),
          });
        }
      }
    } else {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[cancel-label] No se encontró shipment_id en metadata, solo actualizando localmente");
      }
    }

    // Merge seguro de metadata (NO sobreescribir completo)
    const updatedShippingMeta = {
      ...shippingMeta, // Preservar datos existentes
      ...(shipmentId && { shipment_id: shipmentId }), // Asegurar shipment_id
      ...(cancelRequestId && { cancel_request_id: cancelRequestId }), // Agregar cancel_request_id si existe
      ...(cancelStatus && { cancel_status: cancelStatus }), // Agregar cancel_status si existe
    };

    const updatedMetadata = {
      ...currentMetadata, // Preservar todos los campos existentes
      shipping: updatedShippingMeta,
    };

    // Actualizar la orden localmente: estado = "cancelled" (marcar como cancelado)
    // Conservar tracking/label para referencia histórica, pero marcar como cancelado
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_status: "cancelled", // Marcar como cancelado
        metadata: updatedMetadata, // Merge seguro de metadata (incluye cancel_request_id, cancel_status)
        updated_at: new Date().toISOString(),
        // NO limpiar tracking/label: conservar para referencia histórica
      })
      .eq("id", orderId);

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

    if (process.env.NODE_ENV !== "production") {
      console.log("[cancel-label] Envío cancelado exitosamente:", {
        orderId,
        shipmentId,
        cancelRequestId,
        diagnostic,
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Envío cancelado exitosamente",
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

