/**
 * POST /api/admin/orders/[id]/shipping/reset-quote
 * Resetea cotización Skydropx de una orden: elimina quotation_id, rate_id, quoted_package, etc.
 * para forzar recotización con política actual (standard_box 25×20×15 salvo override).
 * No borra la orden ni tracking/label salvo que force=true (y se registra reason).
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { logPreWrite, logPostWrite } from "@/lib/shipping/metadataWriterLogger";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const EXPECTED_CONFIRM_PREFIX = "RESET COTIZACION ";

type ResetQuoteBody = {
  confirm?: string;
  force?: boolean;
  reason?: string;
};

type SuccessResponse = {
  ok: true;
  orderId: string;
  reset: {
    removed: {
      quotation_id: boolean;
      rate_id: boolean;
      rate_used: boolean;
      shipping_pricing: boolean;
      quoted_package: boolean;
    };
    force: boolean;
  };
};

type ErrorResponse = {
  ok: false;
  code: string;
  message: string;
};

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        { ok: false, code: "unauthorized", message: "Acceso denegado" },
        { status: 403 },
      );
    }

    const { id: orderId } = await context.params;
    if (!orderId || !isValidUUID(orderId)) {
      return NextResponse.json(
        { ok: false, code: "invalid_id", message: "ID de orden inválido (debe ser UUID)" },
        { status: 400 },
      );
    }

    const body = (await req.json().catch(() => null)) as ResetQuoteBody | null;
    if (!body || typeof body.confirm !== "string") {
      return NextResponse.json(
        { ok: false, code: "invalid_request", message: "confirm es requerido" },
        { status: 400 },
      );
    }

    const expectedConfirm = EXPECTED_CONFIRM_PREFIX + orderId;
    if (body.confirm.trim() !== expectedConfirm) {
      return NextResponse.json(
        { ok: false, code: "confirm_mismatch", message: "La confirmación no coincide. Escribe exactamente: RESET COTIZACION seguido del ID de la orden." },
        { status: 400 },
      );
    }

    const force = Boolean(body.force);
    const reason = typeof body.reason === "string" ? body.reason.trim() : undefined;
    if (force && (!reason || reason.length < 5)) {
      return NextResponse.json(
        { ok: false, code: "force_requires_reason", message: "Si activas FORZAR, debes indicar una razón (mínimo 5 caracteres)." },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, code: "config_error", message: "Configuración incompleta" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, metadata, shipping_shipment_id, shipping_label_url, shipping_tracking_number, shipping_rate_ext_id, shipping_provider, shipping_service_name, shipping_price_cents")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return NextResponse.json(
        { ok: false, code: "order_not_found", message: "Orden no encontrada" },
        { status: 404 },
      );
    }

    const hasShipment =
      Boolean((order as { shipping_shipment_id?: string | null }).shipping_shipment_id) ||
      Boolean((order as { shipping_label_url?: string | null }).shipping_label_url) ||
      Boolean((order as { shipping_tracking_number?: string | null }).shipping_tracking_number);

    if (hasShipment && !force) {
      return NextResponse.json(
        {
          ok: false,
          code: "has_shipment",
          message: "No se puede resetear porque ya tiene guía. Usa FORZAR con razón para permitir.",
        },
        { status: 409 },
      );
    }

    const currentMetadata = ((order as { metadata?: Record<string, unknown> }).metadata as Record<string, unknown>) || {};
    const currentShipping = (currentMetadata.shipping as Record<string, unknown>) || {};

    const prevQuotationId = typeof currentShipping.quotation_id === "string" ? currentShipping.quotation_id : null;
    const prevRateId =
      typeof (currentShipping.rate as Record<string, unknown>)?.external_id === "string"
        ? (currentShipping.rate as { external_id: string }).external_id
        : typeof currentShipping.selected_rate_id === "string"
          ? currentShipping.selected_rate_id
          : null;
    const hadRateUsed = currentShipping.rate_used != null && typeof currentShipping.rate_used === "object";
    const hadShippingPricing = currentMetadata.shipping_pricing != null && typeof currentMetadata.shipping_pricing === "object";
    const hadQuotedPackage = currentShipping.quoted_package != null && typeof currentShipping.quoted_package === "object";

    const { data: freshOrder } = await supabase
      .from("orders")
      .select("metadata, updated_at")
      .eq("id", orderId)
      .single();

    const freshMetadata = ((freshOrder as { metadata?: Record<string, unknown> } | null)?.metadata as Record<string, unknown>) || {};
    const freshUpdatedAt = (freshOrder as { updated_at?: string } | null)?.updated_at;
    const freshShipping = (freshMetadata.shipping as Record<string, unknown>) || {};

    const quoteResetAudit = {
      at: new Date().toISOString(),
      by: "admin" as const,
      reason: force ? reason ?? null : null,
      force,
      prev: {
        quotation_id: prevQuotationId,
        rate_id: prevRateId,
        had_rate_used: hadRateUsed,
        had_shipping_pricing: hadShippingPricing,
      },
    };

    const newShipping: Record<string, unknown> = {
      ...freshShipping,
      quote_reset: quoteResetAudit,
      quote_state: "reset",
    };
    delete newShipping.quotation_id;
    delete newShipping.quotation_host_used;
    delete newShipping.selected_rate_id;
    delete newShipping.rate_id;
    delete newShipping.rate;
    delete newShipping.rate_used;
    delete newShipping.quoted_package;
    delete newShipping.last_quote_at;

    const finalMetadata: Record<string, unknown> = {
      ...freshMetadata,
      shipping: newShipping,
    };
    const hadFreshShippingPricing = finalMetadata.shipping_pricing != null && typeof finalMetadata.shipping_pricing === "object";
    if (hadFreshShippingPricing) {
      delete finalMetadata.shipping_pricing;
    }

    const updatePayload: {
      metadata: Record<string, unknown>;
      updated_at: string;
      shipping_rate_ext_id?: null;
    } = {
      metadata: finalMetadata,
      updated_at: new Date().toISOString(),
    };
    if (prevRateId != null) {
      updatePayload.shipping_rate_ext_id = null;
    }

    const sha = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "unknown";

    console.log("[admin/reset-quote] PRE-WRITE:", JSON.stringify({
      routeName: "reset-quote",
      orderId,
      sha,
      route: "POST /api/admin/orders/[id]/shipping/reset-quote",
      force,
      hasShipment,
      prev: { quotation_id: !!prevQuotationId, rate_id: !!prevRateId, had_rate_used: hadRateUsed, had_shipping_pricing: hadShippingPricing, had_quoted_package: hadQuotedPackage },
    }));

    logPreWrite("reset-quote", orderId, freshMetadata, freshUpdatedAt, finalMetadata as Record<string, unknown>);

    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select("id, metadata, updated_at")
      .single();

    if (updateError) {
      return NextResponse.json(
        { ok: false, code: "update_failed", message: updateError.message },
        { status: 500 },
      );
    }

    const postMeta = ((updated as { metadata?: Record<string, unknown> }).metadata as Record<string, unknown>) || {};
    const postUpdatedAt = (updated as { updated_at?: string }).updated_at;
    logPostWrite("reset-quote", orderId, postMeta, postUpdatedAt);

    console.log("[admin/reset-quote] POST-WRITE:", JSON.stringify({
      routeName: "reset-quote",
      orderId,
      sha,
      route: "POST /api/admin/orders/[id]/shipping/reset-quote",
      force,
      hasShipment,
    }));

    return NextResponse.json({
      ok: true,
      orderId,
      reset: {
        removed: {
          quotation_id: !!prevQuotationId,
          rate_id: !!prevRateId,
          rate_used: hadRateUsed,
          shipping_pricing: hadShippingPricing,
          quoted_package: hadQuotedPackage,
        },
        force,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: err instanceof Error ? err.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
