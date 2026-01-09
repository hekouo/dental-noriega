import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { getShipment } from "@/lib/skydropx/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SyncLabelRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
});

type SyncLabelResponse =
  | {
      ok: true;
      trackingNumber: string | null;
      labelUrl: string | null;
      shipmentId: string | null;
      updated: boolean;
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
 * Extrae tracking_number desde múltiples rutas posibles
 */
function extractTrackingNumber(response: any): string | null {
  return (
    response.master_tracking_number ||
    response.data?.master_tracking_number ||
    response.tracking_number ||
    response.data?.tracking_number ||
    response.tracking ||
    (response.included && Array.isArray(response.included)
      ? response.included.find((pkg: any) => pkg.tracking_number)?.tracking_number
      : null) ||
    response.shipment?.tracking_number ||
    response.shipment?.master_tracking_number ||
    null
  );
}

/**
 * Extrae label_url desde múltiples rutas posibles
 */
function extractLabelUrl(response: any): string | null {
  if (response.included && Array.isArray(response.included)) {
    const firstPackage = response.included.find((pkg: any) => pkg.label_url);
    if (firstPackage?.label_url) {
      return firstPackage.label_url;
    }
  }
  return (
    response.label_url ||
    response.data?.label_url ||
    response.label_url_pdf ||
    response.files?.label ||
    response.shipment?.label_url ||
    null
  );
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
      .select("*")
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

    // Extraer shipment_id de metadata
    const metadata = (orderData.metadata as Record<string, unknown>) || {};
    const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
    const shipmentId = (shippingMeta.shipment_id as string) || null;

    if (!shipmentId) {
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
    const shipmentResponse = await getShipment(shipmentId);

    // Extraer tracking y label
    const trackingNumber = extractTrackingNumber(shipmentResponse);
    const labelUrl = extractLabelUrl(shipmentResponse);

    // Determinar si hay cambios
    const hasChanges =
      (trackingNumber !== null && trackingNumber !== orderData.shipping_tracking_number) ||
      (labelUrl !== null && labelUrl !== orderData.shipping_label_url);

    if (hasChanges) {
      // Actualizar la orden
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (trackingNumber) {
        updateData.shipping_tracking_number = trackingNumber;
      }
      if (labelUrl) {
        updateData.shipping_label_url = labelUrl;
      }

      // Actualizar shipping_status
      if (trackingNumber && labelUrl) {
        updateData.shipping_status = "label_created";
      } else if (trackingNumber || labelUrl) {
        updateData.shipping_status = "label_pending_tracking";
      }

      await supabase.from("orders").update(updateData).eq("id", orderId);

      if (process.env.NODE_ENV !== "production") {
        console.log("[sync-label] Tracking/label actualizados:", {
          orderId,
          shipmentId,
          trackingNumber: trackingNumber || "[pendiente]",
          hasLabel: !!labelUrl,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      trackingNumber: trackingNumber || orderData.shipping_tracking_number || null,
      labelUrl: labelUrl || orderData.shipping_label_url || null,
      shipmentId,
      updated: hasChanges,
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
