import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { normalizeShippingPricing } from "@/lib/shipping/normalizeShippingPricing";
import { normalizeShippingMetadata, addShippingMetadataDebug, preserveRateUsed, ensureRateUsedInMetadata } from "@/lib/shipping/normalizeShippingMetadata";
import { logPreWrite, logPostWrite } from "@/lib/shipping/metadataWriterLogger";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";
import { validateRateUsedPersistence } from "@/lib/shipping/validateRateUsedPersistence";
import { mergeRateUsedPreserveCents } from "@/lib/shipping/mergeRateUsedPreserveCents";

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
    const normalizedPricingFromInput = normalizeShippingPricing(pricingInput);
    if (normalizedPricingFromInput) {
      updatedMetadata.shipping_pricing = normalizedPricingFromInput;
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
    
    // CRÍTICO: Asegurar que rate_used tenga los valores correctos del canonical pricing
    // antes de aplicar preserveRateUsed. Esto garantiza que apply-rate pueda actualizar
    // rate_used incluso si DB tiene valores viejos.
    const normalizedShippingMeta = normalized.shippingMeta;
    const canonicalPricing = normalized.shippingPricing;
    const normalizedRateUsed = (normalizedShippingMeta.rate_used as Record<string, unknown>) || {};
    
    // Si canonical pricing existe, asegurar que rate_used refleje esos valores
    if (canonicalPricing) {
      const canonCarrier = canonicalPricing.carrier_cents ?? null;
      const canonTotal = canonicalPricing.total_cents ?? null;
      const canonCustomerTotal = canonicalPricing.customer_total_cents ?? canonTotal ?? null;
      
      // Actualizar rate_used con valores del canonical pricing
      const updatedRateUsed: Record<string, unknown> = {
        ...normalizedRateUsed,
        ...(canonCarrier != null ? { carrier_cents: canonCarrier } : {}),
        ...(canonTotal != null ? { price_cents: canonTotal } : {}),
        ...(canonCustomerTotal != null ? { customer_total_cents: canonCustomerTotal } : {}),
      };
      
      normalizedShippingMeta.rate_used = updatedRateUsed;
    }
    
    const finalMetadata: Record<string, unknown> = {
      ...metadataWithPricing,
      shipping: addShippingMetadataDebug(normalizedShippingMeta, "apply-rate", metadataWithPricing),
    };
    
    // Validación crítica: Si existe canonical pricing pero rate_used tiene nulls, NO persistir silenciosamente
    const finalShippingMetaForValidation = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsedForValidation = finalShippingMetaForValidation?.rate_used as { carrier_cents?: number | null; price_cents?: number | null } | null | undefined;
    const finalPricingForValidation = finalMetadata.shipping_pricing as { carrier_cents?: number | null; total_cents?: number | null } | null | undefined;
    
    if (finalPricingForValidation && (finalPricingForValidation.carrier_cents != null || finalPricingForValidation.total_cents != null)) {
      // Existe canonical pricing con números
      if (finalRateUsedForValidation && (finalRateUsedForValidation.carrier_cents == null || finalRateUsedForValidation.price_cents == null)) {
        // Structured logging para prevenir log injection
        const sanitizedOrderId = sanitizeForLog(orderId);
        console.error("[apply-rate] CRITICAL: canonical pricing exists but rate_used has nulls", {
          orderId: sanitizedOrderId,
          rateUsedCarrierCents: finalRateUsedForValidation.carrier_cents,
          rateUsedPriceCents: finalRateUsedForValidation.price_cents,
          pricingCarrierCents: finalPricingForValidation.carrier_cents,
          pricingTotalCents: finalPricingForValidation.total_cents,
        });
        if (process.env.NODE_ENV !== "production") {
          throw new Error(`[apply-rate] CRITICAL: canonical pricing exists but rate_used has nulls for orderId=${sanitizedOrderId}`);
        }
      }
    }
    const finalTotal = canonicalPricing?.total_cents ?? normalizedPricingFromInput?.total_cents;

    // CRÍTICO: Releer metadata justo antes del update para evitar race conditions
    const { data: freshOrderData } = await supabase
      .from("orders")
      .select("metadata, updated_at")
      .eq("id", orderId)
      .single();
    
    const freshMetadata = (freshOrderData?.metadata as Record<string, unknown>) || {};
    const freshUpdatedAt = freshOrderData?.updated_at as string | null | undefined;
    
    // Aplicar preserveRateUsed para garantizar que rate_used nunca quede null
    const finalMetadataWithPreserve = preserveRateUsed(freshMetadata, finalMetadata);
    
    // CRÍTICO: Asegurar que rate_used esté presente en el payload final antes de escribir
    // Esto garantiza persistencia real en Supabase, incluso si normalizeShippingMetadata
    // o preserveRateUsed no lo incluyeron correctamente
    let finalMetadataForDb = ensureRateUsedInMetadata(finalMetadataWithPreserve);

    // CRÍTICO: Aplicar mergeRateUsedPreserveCents JUSTO antes de persistir
    // Esto garantiza que los cents nunca queden null
    const finalShippingMeta = (finalMetadataForDb.shipping as Record<string, unknown>) || {};
    const finalRateUsed = (finalShippingMeta.rate_used as Record<string, unknown>) || {};
    const finalShippingPricing = finalMetadataForDb.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
      customer_total_cents?: number | null;
    } | null | undefined;
    
    // Merge preservando cents
    const mergedRateUsed = mergeRateUsedPreserveCents(
      finalRateUsed,
      finalRateUsed, // incoming es el mismo porque ya pasó por ensureRateUsedInMetadata
      finalShippingPricing,
    );
    
    // Actualizar metadata con rate_used mergeado
    finalMetadataForDb = {
      ...finalMetadataForDb,
      shipping: {
        ...finalShippingMeta,
        rate_used: mergedRateUsed,
      },
    };

    // GUARDRAIL: Verificar que el payload tiene rate_used antes de escribir
    const shippingPricingForCheck = finalMetadataForDb.shipping_pricing as {
      carrier_cents?: number | null;
      total_cents?: number | null;
    } | null | undefined;
    const shippingMetaForCheck = (finalMetadataForDb.shipping as Record<string, unknown>) || {};
    const rateUsedForCheck = (shippingMetaForCheck.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
    }) || null;

    const hasPricingNumbers = shippingPricingForCheck && (
      (typeof shippingPricingForCheck.carrier_cents === "number" && shippingPricingForCheck.carrier_cents > 0) ||
      (typeof shippingPricingForCheck.total_cents === "number" && shippingPricingForCheck.total_cents > 0)
    );

    const rateUsedIsNull = !rateUsedForCheck || (
      (rateUsedForCheck.price_cents == null || rateUsedForCheck.price_cents === null) ||
      (rateUsedForCheck.carrier_cents == null || rateUsedForCheck.carrier_cents === null)
    );

    if (hasPricingNumbers && rateUsedIsNull) {
      // Structured logging: primer argumento constante, valores dinámicos en objeto
      const sanitizedOrderIdForGuardrail = sanitizeForLog(orderId);
      console.error("[apply-rate] GUARDRAIL: Abortando write. shipping_pricing tiene números pero rate_used tiene nulls", {
        orderId: sanitizedOrderIdForGuardrail,
        pricingTotalCents: shippingPricingForCheck.total_cents,
        pricingCarrierCents: shippingPricingForCheck.carrier_cents,
        rateUsedPriceCents: rateUsedForCheck?.price_cents,
        rateUsedCarrierCents: rateUsedForCheck?.carrier_cents,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "inconsistent_metadata",
          message: "Error: metadata inconsistente. Revisa los logs.",
        } satisfies ApplyRateResponse,
        { status: 500 },
      );
    }

    // LOGGING: Payload exacto que se va a escribir
    const finalPayloadShippingMeta = (finalMetadataForDb.shipping as Record<string, unknown>) || {};
    const finalPayloadRateUsed = (finalPayloadShippingMeta.rate_used as {
      price_cents?: number | null;
      carrier_cents?: number | null;
    }) || null;
    const finalPayloadPricing = finalMetadataForDb.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
    } | null | undefined;

    // Structured logging para prevenir log injection
    const sanitizedOrderId = sanitizeForLog(orderId);
    console.log("[apply-rate] FINAL_PAYLOAD (antes de .update())", {
      orderId: sanitizedOrderId,
      metadataShippingRateUsedPriceCents: finalPayloadRateUsed?.price_cents ?? null,
      metadataShippingRateUsedCarrierCents: finalPayloadRateUsed?.carrier_cents ?? null,
      metadataShippingPricingTotalCents: finalPayloadPricing?.total_cents ?? null,
      metadataShippingPricingCarrierCents: finalPayloadPricing?.carrier_cents ?? null,
    });

    // CRÍTICO: Log del objeto EXACTO que se pasa a .update()
    // Usar la MISMA variable que se pasa al update (finalMetadataForDb)
    const exactMetadataToDb = finalMetadataForDb;
    const exactShippingMeta = (exactMetadataToDb.shipping as Record<string, unknown>) || {};
    const exactRateUsed = (exactShippingMeta.rate_used as Record<string, unknown>) || null;
    const exactPricing = exactMetadataToDb.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
    } | null | undefined;
    
    console.log("[apply-rate] FINAL_METADATA_TO_DB (objeto EXACTO que entra a .update())", {
      orderId: sanitizedOrderId,
      rateUsedPriceCents: exactRateUsed?.price_cents ?? null,
      rateUsedCarrierCents: exactRateUsed?.carrier_cents ?? null,
      rateUsedCustomerTotalCents: exactRateUsed?.customer_total_cents ?? null,
      pricingTotalCents: exactPricing?.total_cents ?? null,
      pricingCarrierCents: exactPricing?.carrier_cents ?? null,
      rateUsedKeys: exactRateUsed ? Object.keys(exactRateUsed) : [],
      rateUsedFull: exactRateUsed,
    });

    // GUARDRAIL FINAL: Si shipping_pricing tiene números y rate_used.*_cents sigue null -> throw
    const finalHasPricingNumbers = exactPricing && (
      (typeof exactPricing.total_cents === "number" && exactPricing.total_cents > 0) ||
      (typeof exactPricing.carrier_cents === "number" && exactPricing.carrier_cents > 0)
    );
    const finalRateUsedStillNull = !exactRateUsed || (
      (exactRateUsed.price_cents == null || exactRateUsed.price_cents === null) ||
      (exactRateUsed.carrier_cents == null || exactRateUsed.carrier_cents === null)
    );

    if (finalHasPricingNumbers && finalRateUsedStillNull) {
      const errorMsg = `[apply-rate] GUARDRAIL FINAL: Abortando write. shipping_pricing tiene números pero rate_used.*_cents sigue null después de mergeRateUsedPreserveCents. orderId=${sanitizedOrderId}`;
      console.error(errorMsg, {
        orderId: sanitizedOrderId,
        pricing: exactPricing,
        rateUsed: exactRateUsed,
        rateUsedKeys: exactRateUsed ? Object.keys(exactRateUsed) : [],
      });
      return NextResponse.json(
        {
          ok: false,
          code: "inconsistent_metadata",
          message: "Error: metadata inconsistente después de merge. Revisa los logs.",
        } satisfies ApplyRateResponse,
        { status: 500 },
      );
    }

    // INSTRUMENTACIÓN PRE-WRITE
    logPreWrite("apply-rate", orderId, freshMetadata, freshUpdatedAt, finalMetadataForDb);

    // Actualizar order con return=representation para obtener metadata post-write
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        shipping_rate_ext_id: rateExternalId,
        shipping_provider: "skydropx",
        shipping_service_name: service,
        shipping_price_cents: finalTotal ?? priceCents,
        shipping_eta_min_days: typeof etaMin === "number" ? etaMin : null,
        shipping_eta_max_days: typeof etaMax === "number" ? etaMax : null,
        shipping_status: "rate_selected",
        metadata: finalMetadataForDb,
        updated_at: now,
      })
      .eq("id", orderId)
      .select("id, metadata, updated_at")
      .single();

    if (updateError) {
      // Structured logging: primer argumento constante, error sanitizado en objeto
      console.error("[apply-rate] Error al actualizar orden", {
        errorCode: updateError.code ?? null,
        errorMessage: sanitizeForLog(updateError.message),
        errorDetails: sanitizeForLog(updateError.details),
        errorHint: sanitizeForLog(updateError.hint),
      });
      return NextResponse.json(
        {
          ok: false,
          code: "update_failed",
          message: "Error al actualizar la orden. Revisa los logs.",
        } satisfies ApplyRateResponse,
        { status: 500 },
      );
    }

    // CRÍTICO: Reread post-write para verificar persistencia real en DB (RAW, sin normalizadores)
    const { data: rereadOrder, error: rereadError } = await supabase
      .from("orders")
      .select("id, updated_at, metadata")
      .eq("id", orderId)
      .single();

    if (rereadError) {
      console.error("[apply-rate] Error al releer orden post-write:", rereadError);
    } else {
      // RAW_DB: Leer directamente sin normalizadores/helpers
      const rawDbMetadata = rereadOrder?.metadata as Record<string, unknown> | null | undefined;
      const rawDbShipping = (rawDbMetadata?.shipping as Record<string, unknown>) || null;
      const rawDbRateUsed = (rawDbShipping?.rate_used as Record<string, unknown>) || null;
      const rawDbPricing = (rawDbMetadata?.shipping_pricing as Record<string, unknown>) || null;

      // RAW_DB reread log: valores exactos desde DB sin procesamiento
      // Structured logging para prevenir log injection
      const sanitizedOrderIdForReread = sanitizeForLog(orderId);
      console.log("[apply-rate] RAW_DB reread (post-write, sin normalizadores)", {
        orderId: sanitizedOrderIdForReread,
        updatedAt: rereadOrder?.updated_at ?? null,
        metadataShippingRateUsedPriceCents: rawDbRateUsed?.price_cents ?? null,
        metadataShippingRateUsedCarrierCents: rawDbRateUsed?.carrier_cents ?? null,
        metadataShippingPricingTotalCents: rawDbPricing?.total_cents ?? null,
        metadataShippingPricingCarrierCents: rawDbPricing?.carrier_cents ?? null,
        metadataShippingRateUsedFull: rawDbRateUsed,
      });

      // CRÍTICO: Log explícito desde DB usando paths JSONB (simulando SQL)
      // Esto muestra exactamente lo que SQL vería: metadata #>> '{shipping,rate_used,price_cents}'
      const dbPriceCents = rawDbRateUsed?.price_cents ?? null;
      const dbCarrierCents = rawDbRateUsed?.carrier_cents ?? null;
      const dbPricingTotalCents = rawDbPricing?.total_cents ?? null;
      const dbPricingCarrierCents = rawDbPricing?.carrier_cents ?? null;
      
      console.log("[apply-rate] DB_VERIFICATION (simulando SQL paths)", {
        orderId: sanitizedOrderIdForReread,
        "db.metadata #>> '{shipping,rate_used,price_cents}'": dbPriceCents,
        "db.metadata #>> '{shipping,rate_used,carrier_cents}'": dbCarrierCents,
        "db.metadata #>> '{shipping_pricing,total_cents}'": dbPricingTotalCents,
        "db.metadata #>> '{shipping_pricing,carrier_cents}'": dbPricingCarrierCents,
        beforeUpdateHadNumbers: finalPayloadRateUsed && (
          (finalPayloadRateUsed.price_cents != null && finalPayloadRateUsed.price_cents !== null) ||
          (finalPayloadRateUsed.carrier_cents != null && finalPayloadRateUsed.carrier_cents !== null)
        ),
        afterUpdateHasNumbers: rawDbRateUsed && (
          (rawDbRateUsed.price_cents != null && rawDbRateUsed.price_cents !== null) ||
          (rawDbRateUsed.carrier_cents != null && rawDbRateUsed.carrier_cents !== null)
        ),
        discrepancy: (finalPayloadRateUsed && (
          (finalPayloadRateUsed.price_cents != null && finalPayloadRateUsed.price_cents !== null) ||
          (finalPayloadRateUsed.carrier_cents != null && finalPayloadRateUsed.carrier_cents !== null)
        )) && !(rawDbRateUsed && (
          (rawDbRateUsed.price_cents != null && rawDbRateUsed.price_cents !== null) ||
          (rawDbRateUsed.carrier_cents != null && rawDbRateUsed.carrier_cents !== null)
        )),
      });

      // CANARY VALIDATION: Verificar persistencia de rate_used.*_cents
      const validationResult = validateRateUsedPersistence(
        rawDbMetadata,
        orderId,
        "apply-rate",
      );
      
      if (validationResult.discrepancy) {
        // El log CRITICAL ya se hizo dentro de validateRateUsedPersistence
        // Aquí solo confirmamos que detectamos el problema
        console.error("[apply-rate] CANARY DETECTED BUG: rate_used.*_cents no persistió correctamente", {
          orderId: sanitizedOrderIdForReread,
          validationResult,
        });
      }

      // Detectar discrepancia entre payload y DB
      const payloadHadRateUsed = finalPayloadRateUsed && (
        (finalPayloadRateUsed.price_cents != null && finalPayloadRateUsed.price_cents !== null) ||
        (finalPayloadRateUsed.carrier_cents != null && finalPayloadRateUsed.carrier_cents !== null)
      );
      const dbHasRateUsed = rawDbRateUsed && (
        (rawDbRateUsed.price_cents != null && rawDbRateUsed.price_cents !== null) ||
        (rawDbRateUsed.carrier_cents != null && rawDbRateUsed.carrier_cents !== null)
      );

      if (payloadHadRateUsed && !dbHasRateUsed) {
        // Structured logging para prevenir log injection
        const sanitizedOrderIdForDiscrepancy = sanitizeForLog(orderId);
        console.error("[apply-rate] DISCREPANCIA CRÍTICA: Payload tenía rate_used pero DB no", {
          orderId: sanitizedOrderIdForDiscrepancy,
          finalPayloadRateUsed,
          rawDbRateUsed,
        });
      }
    }

    // INSTRUMENTACIÓN POST-WRITE (usar reread para valores reales de DB)
    const postWriteMetadata = (rereadOrder?.metadata || updatedOrder?.metadata) as Record<string, unknown> || {};
    const postWriteUpdatedAt = updatedOrder?.updated_at as string | null | undefined;
    logPostWrite("apply-rate", orderId, postWriteMetadata, postWriteUpdatedAt);

    return NextResponse.json({
      ok: true,
      message: "Tarifa actualizada correctamente.",
    } satisfies ApplyRateResponse);
  } catch (error) {
    // Structured logging: primer argumento constante, error sanitizado en objeto
    const errorName = error instanceof Error ? error.name : "Unknown";
    const errorMessage = error instanceof Error ? sanitizeForLog(error.message) : sanitizeForLog(String(error));
    const errorStack = error instanceof Error ? sanitizeForLog(error.stack?.substring(0, 500) ?? null) : null;
    console.error("[apply-rate] Error inesperado", {
      errorName,
      errorMessage,
      errorStack,
    });
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
