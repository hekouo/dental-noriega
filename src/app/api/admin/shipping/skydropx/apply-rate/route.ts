import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";

export const dynamic = "force-dynamic";

type ApplyRateResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

/**
 * POST /api/admin/shipping/skydropx/apply-rate
 * 
 * Aplica una nueva tarifa a una orden existente
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "No tienes permisos para realizar esta acción.",
        } satisfies ApplyRateResponse,
        { status: 401 },
      );
    }

    const body = await req.json();
    const {
      orderId,
      rateExternalId,
      service,
      provider,
      priceCents,
      etaMin,
      etaMax,
      optionCode,
      customerTotalCents,
    } = body;

    // Validaciones básicas
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "orderId es requerido.",
        } satisfies ApplyRateResponse,
        { status: 400 },
      );
    }

    if (
      !rateExternalId ||
      typeof rateExternalId !== "string" ||
      !service ||
      typeof service !== "string" ||
      !provider ||
      typeof provider !== "string" ||
      typeof priceCents !== "number"
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "Campos requeridos: rateExternalId, service, provider, priceCents.",
        } satisfies ApplyRateResponse,
        { status: 400 },
      );
    }

    // Obtener orden
    const order = await getOrderWithItemsAdmin(orderId);
    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "La orden no existe.",
        } satisfies ApplyRateResponse,
        { status: 404 },
      );
    }

    // Validar que la orden no tenga tracking_number/label_url ya creada
    if (order.shipping_tracking_number || order.shipping_label_url) {
      return NextResponse.json(
        {
          ok: false,
          code: "label_already_created",
          message:
            "No se puede cambiar la tarifa porque ya se creó la guía. Primero cancela la guía existente.",
        } satisfies ApplyRateResponse,
        { status: 409 },
      );
    }

    // Preparar actualizaciones para orders
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Supabase incompleta.",
        } satisfies ApplyRateResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const now = new Date().toISOString();

    // Obtener metadata actual
    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const currentShippingMeta = (currentMetadata.shipping as Record<string, unknown>) || {};

    // Actualizar metadata.shipping
    const updatedShippingMeta = {
      ...currentShippingMeta,
      rate: {
        external_id: rateExternalId,
        provider,
        service,
        eta_min_days: typeof etaMin === "number" ? etaMin : null,
        eta_max_days: typeof etaMax === "number" ? etaMax : null,
        option_code: typeof optionCode === "string" ? optionCode : undefined,
      },
      quoted_at: now,
      price_cents: priceCents,
    };

    // Merge seguro de metadata
    const updatedMetadata: Record<string, unknown> = {
      ...currentMetadata,
      shipping: updatedShippingMeta,
    };
    if (typeof customerTotalCents === "number") {
      updatedMetadata.shipping_pricing = {
        carrier_cents: priceCents,
        packaging_cents: Math.max(0, customerTotalCents - priceCents),
        total_cents: customerTotalCents,
      };
    }

    // Actualizar order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_rate_ext_id: rateExternalId,
        shipping_provider: "skydropx",
        shipping_service_name: service,
        shipping_price_cents: priceCents,
        shipping_eta_min_days: typeof etaMin === "number" ? etaMin : null,
        shipping_eta_max_days: typeof etaMax === "number" ? etaMax : null,
        shipping_status: "rate_selected",
        metadata: updatedMetadata,
        updated_at: now,
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("[apply-rate] Error al actualizar orden:", updateError);
      return NextResponse.json(
        {
          ok: false,
          code: "update_failed",
          message: "Error al actualizar la orden. Revisa los logs.",
        } satisfies ApplyRateResponse,
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Tarifa actualizada correctamente.",
    } satisfies ApplyRateResponse);
  } catch (error) {
    console.error("[apply-rate] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Error al aplicar la tarifa. Revisa los logs.",
      } satisfies ApplyRateResponse,
      { status: 500 },
    );
  }
}
