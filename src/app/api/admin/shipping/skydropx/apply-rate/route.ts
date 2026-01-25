import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { normalizeShippingPricing } from "@/lib/shipping/normalizeShippingPricing";
import { normalizeShippingMetadata, addShippingMetadataDebug } from "@/lib/shipping/normalizeShippingMetadata";

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
      marginCents,
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
      rate_used: {
        external_rate_id: rateExternalId,
        provider,
        service,
        eta_min_days: typeof etaMin === "number" ? etaMin : null,
        eta_max_days: typeof etaMax === "number" ? etaMax : null,
        carrier_cents: priceCents,
        price_cents: priceCents,
        selected_at: now,
        selection_source: "admin",
      },
      quoted_at: now,
      price_cents: priceCents,
      option_code: typeof optionCode === "string" ? optionCode : currentShippingMeta.option_code,
    };

    // Merge seguro de metadata
    const updatedMetadata: Record<string, unknown> = {
      ...currentMetadata,
      shipping: updatedShippingMeta,
    };
    const existingPricing = (currentMetadata.shipping_pricing as Record<string, unknown>) || null;
    const totalFromExisting =
      typeof existingPricing?.total_cents === "number"
        ? existingPricing.total_cents
        : typeof existingPricing?.customer_total_cents === "number"
          ? existingPricing.customer_total_cents
          : typeof customerTotalCents === "number"
            ? customerTotalCents
            : undefined;
    const packagingCents =
      typeof existingPricing?.packaging_cents === "number" ? existingPricing.packaging_cents : 2000;
    const computedMarginCents =
      typeof totalFromExisting === "number"
        ? Math.max(0, totalFromExisting - priceCents - packagingCents)
        : typeof marginCents === "number"
          ? marginCents
          : typeof existingPricing?.margin_cents === "number"
            ? existingPricing.margin_cents
            : Math.min(Math.round(priceCents * 0.05), 3000);
    const totalCents =
      typeof totalFromExisting === "number"
        ? totalFromExisting
        : priceCents + packagingCents + computedMarginCents;
    const pricingInput = {
      carrier_cents: priceCents,
      packaging_cents: packagingCents,
      margin_cents: computedMarginCents,
      total_cents: totalCents,
      customer_eta_min_days:
        typeof existingPricing?.customer_eta_min_days === "number" ? existingPricing.customer_eta_min_days : etaMin,
      customer_eta_max_days:
        typeof existingPricing?.customer_eta_max_days === "number" ? existingPricing.customer_eta_max_days : etaMax,
    };
    const normalizedPricing = normalizeShippingPricing(pricingInput);
    if (normalizedPricing) {
      updatedMetadata.shipping_pricing = normalizedPricing;
    }
    const normalized = normalizeShippingMetadata(updatedMetadata, {
      source: "admin",
      orderId,
    });

    // Construir metadata con pricing primero para pasarlo a addShippingMetadataDebug
    const metadataWithPricing: Record<string, unknown> = {
      ...updatedMetadata,
      ...(normalized.shippingPricing ? { shipping_pricing: normalized.shippingPricing } : {}),
    };
    
    const finalMetadata: Record<string, unknown> = {
      ...metadataWithPricing,
      shipping: addShippingMetadataDebug(normalized.shippingMeta, "apply-rate", metadataWithPricing),
    };
    
    // Validación crítica: Si existe canonical pricing pero rate_used tiene nulls, NO persistir silenciosamente
    const finalShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsed = finalShippingMeta?.rate_used as { carrier_cents?: number | null; price_cents?: number | null } | null | undefined;
    const finalPricing = finalMetadata.shipping_pricing as { carrier_cents?: number | null; total_cents?: number | null } | null | undefined;
    
    if (finalPricing && (finalPricing.carrier_cents != null || finalPricing.total_cents != null)) {
      // Existe canonical pricing con números
      if (finalRateUsed && (finalRateUsed.carrier_cents == null || finalRateUsed.price_cents == null)) {
        const errorMsg = `[apply-rate] CRITICAL: canonical pricing exists but rate_used has nulls. orderId=${orderId}, carrier_cents=${finalRateUsed.carrier_cents}, price_cents=${finalRateUsed.price_cents}, pricing.carrier_cents=${finalPricing.carrier_cents}, pricing.total_cents=${finalPricing.total_cents}`;
        if (process.env.NODE_ENV === "production") {
          console.error(errorMsg);
        } else {
          throw new Error(errorMsg);
        }
      }
    }
    const finalTotal = normalized.shippingPricing?.total_cents ?? normalizedPricing?.total_cents;

    // Actualizar order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_rate_ext_id: rateExternalId,
        shipping_provider: "skydropx",
        shipping_service_name: service,
        shipping_price_cents: finalTotal ?? priceCents,
        shipping_eta_min_days: typeof etaMin === "number" ? etaMin : null,
        shipping_eta_max_days: typeof etaMax === "number" ? etaMax : null,
        shipping_status: "rate_selected",
        metadata: finalMetadata,
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
