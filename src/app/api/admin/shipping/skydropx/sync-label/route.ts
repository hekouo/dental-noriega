import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { getShipment, type SkydropxShipmentResponse } from "@/lib/skydropx/client";
import { normalizeShippingMetadata, addShippingMetadataDebug, preserveRateUsed, ensureRateUsedInMetadata } from "@/lib/shipping/normalizeShippingMetadata";
import { logPreWrite, logPostWrite } from "@/lib/shipping/metadataWriterLogger";
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
 * Extrae tracking_number y label_url desde respuesta JSON:API de Skydropx
 * Soporta formato JSON:API con attributes y compatibilidad legacy
 */
function extractTrackingAndLabelFromPackages(
  response: SkydropxShipmentResponse,
): { trackingNumber: string | null; labelUrl: string | null; strategy: string } {
  const anyResponse = response as any;

  // Estrategia 1: JSON:API - data.attributes.master_tracking_number (PRIORITARIO)
  if (anyResponse.data?.attributes?.master_tracking_number && typeof anyResponse.data.attributes.master_tracking_number === "string") {
    const tracking = anyResponse.data.attributes.master_tracking_number.trim();
    if (tracking.length > 0) {
      // Buscar label en included si hay tracking
      let label: string | null = null;
      let labelStrategy = "";
      if (response.included && Array.isArray(response.included)) {
        for (const item of response.included) {
          const itemAny = item as any;
          if (itemAny.attributes?.label_url && typeof itemAny.attributes.label_url === "string") {
            label = itemAny.attributes.label_url.trim();
            labelStrategy = "included.attributes.label_url";
            break;
          }
          if (itemAny.attributes?.label_url_pdf && typeof itemAny.attributes.label_url_pdf === "string") {
            label = itemAny.attributes.label_url_pdf.trim();
            labelStrategy = "included.attributes.label_url_pdf";
            break;
          }
        }
      }
      return {
        trackingNumber: tracking,
        labelUrl: label,
        strategy: label ? `data.attributes.master_tracking_number+${labelStrategy}` : "data.attributes.master_tracking_number",
      };
    }
  }

  // Estrategia 2: JSON:API - data.attributes.tracking_number
  if (anyResponse.data?.attributes?.tracking_number && typeof anyResponse.data.attributes.tracking_number === "string") {
    const tracking = anyResponse.data.attributes.tracking_number.trim();
    if (tracking.length > 0) {
      let label: string | null = null;
      let labelStrategy = "";
      if (response.included && Array.isArray(response.included)) {
        for (const item of response.included) {
          const itemAny = item as any;
          if (itemAny.attributes?.label_url && typeof itemAny.attributes.label_url === "string") {
            label = itemAny.attributes.label_url.trim();
            labelStrategy = "included.attributes.label_url";
            break;
          }
        }
      }
      return {
        trackingNumber: tracking,
        labelUrl: label,
        strategy: label ? `data.attributes.tracking_number+${labelStrategy}` : "data.attributes.tracking_number",
      };
    }
  }

  // Estrategia 3: JSON:API - included[].attributes (packages) - PRIORITARIO para packages
  if (response.included && Array.isArray(response.included)) {
    // Filtrar solo packages si tienen type
    const packages = response.included.filter((item: any) => {
      if (item.type === "packages") return true;
      // Si no hay type, asumir que es package si tiene attributes con tracking/label
      return item.attributes && (item.attributes.tracking_number || item.attributes.label_url);
    });

    // Buscar el mejor candidato: package con tracking_number Y label_url no vacíos
    const bestPackage = packages.find((pkg: any) => {
      const tracking = pkg.attributes?.tracking_number || pkg.tracking_number;
      const label = pkg.attributes?.label_url || pkg.attributes?.label_url_pdf || pkg.label_url;
      const hasTracking = tracking && typeof tracking === "string" && tracking.trim().length > 0;
      const hasLabel = label && typeof label === "string" && label.trim().length > 0;
      return hasTracking && hasLabel;
    });

    if (bestPackage) {
      const pkgAny = bestPackage as any;
      const tracking = (pkgAny.attributes?.tracking_number || pkgAny.tracking_number) as string | undefined;
      const label = (pkgAny.attributes?.label_url || pkgAny.attributes?.label_url_pdf || pkgAny.label_url) as string | undefined;
      return {
        trackingNumber: tracking?.trim() || null,
        labelUrl: label?.trim() || null,
        strategy: pkgAny.attributes ? "included.attributes.tracking_number+included.attributes.label_url" : "included_packages_best",
      };
    }

    // Si no hay package con ambos, buscar el primero con tracking_number
    const packageWithTracking = packages.find((pkg: any) => {
      const tracking = pkg.attributes?.tracking_number || pkg.tracking_number;
      return tracking && typeof tracking === "string" && tracking.trim().length > 0;
    });

    // Y el primero con label_url
    const packageWithLabel = packages.find((pkg: any) => {
      const label = pkg.attributes?.label_url || pkg.attributes?.label_url_pdf || pkg.label_url;
      return label && typeof label === "string" && label.trim().length > 0;
    });

    if (packageWithTracking || packageWithLabel) {
      const tracking = packageWithTracking
        ? (((packageWithTracking as any).attributes?.tracking_number || (packageWithTracking as any).tracking_number) as string | undefined)
        : null;
      const label = packageWithLabel
        ? (((packageWithLabel as any).attributes?.label_url || (packageWithLabel as any).attributes?.label_url_pdf || (packageWithLabel as any).label_url) as string | undefined)
        : null;
      const strategy = (packageWithTracking as any)?.attributes || (packageWithLabel as any)?.attributes
        ? "included.attributes.separate"
        : "included_packages_separate";
      return {
        trackingNumber: tracking?.trim() || null,
        labelUrl: label?.trim() || null,
        strategy,
      };
    }
  }

  // Estrategia 4: Legacy - response directo (compatibilidad)
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
      strategy: "legacy.direct",
    };
  }

  // Estrategia 5: Legacy - response.shipment (compatibilidad)
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
        strategy: "legacy.shipment",
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
      .select("id, shipping_shipment_id, shipping_tracking_number, shipping_label_url, shipping_status, shipping_status_updated_at, shipping_provider, metadata")
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
    const anyResponse = shipmentResponse as any;
    const included = Array.isArray(anyResponse.included) ? anyResponse.included : [];
    
    // Contar packages reales (con type === "packages" o con attributes)
    const packagesCount = included.filter((item: any) => {
      if (item.type === "packages") return true;
      // Si no hay type, contar si tiene attributes (probablemente es un package)
      return item.attributes && typeof item.attributes === "object";
    }).length;

    // Resumen de estructura para diagnóstico (solo non-production)
    const hasData = !!anyResponse.data;
    const hasDataAttributes = !!anyResponse.data?.attributes;
    const includedCount = included.length;
    const includedTypesSample = included
      .slice(0, 3)
      .map((item: any) => item.type || "no-type")
      .filter((t: string) => t !== "no-type");
    const includedHasAttributesCount = included.filter((item: any) => item.attributes && typeof item.attributes === "object").length;

    const foundTracking = !!extractedTracking;
    const foundLabel = !!extractedLabel;

    // Si strategyUsed === 'none', agregar logs de diagnóstico más detallados
    const needsDebugLog = extractionStrategy === "none" && (includedCount > 0 || hasData);

    console.log("[sync-label] Datos extraídos de Skydropx:", {
      shipmentId: finalShipmentId,
      packagesCount,
      foundTracking,
      foundLabel,
      strategyUsed: extractionStrategy,
      ...(process.env.NODE_ENV !== "production" || needsDebugLog
        ? {
            structure: {
              hasData,
              hasDataAttributes,
              includedCount,
              includedTypesSample: includedTypesSample.length > 0 ? includedTypesSample : undefined,
              includedHasAttributesCount,
              // Si strategyUsed === 'none', incluir más detalles para debugging
              ...(needsDebugLog
                ? {
                    sampleIncludedKeys:
                      included.length > 0 && included[0]
                        ? Object.keys(included[0]).slice(0, 15).filter((k) => !["address", "phone", "email", "name"].some((pii) => k.toLowerCase().includes(pii)))
                        : undefined,
                    dataAttributesKeys: anyResponse.data?.attributes ? Object.keys(anyResponse.data.attributes).slice(0, 15) : undefined,
                    includedFirstItemType: included[0]?.type || undefined,
                    includedFirstItemHasAttributes: !!(included[0]?.attributes && typeof included[0].attributes === "object"),
                  }
                : {}),
            },
          }
        : {}),
    });
    // Determinar si hay cambios (solo tracking/label, NO null sobreescribe existentes)
    const hasTrackingChange = extractedTracking && extractedTracking.trim().length > 0 && extractedTracking !== orderData.shipping_tracking_number;
    const hasLabelChange = extractedLabel && extractedLabel.trim().length > 0 && extractedLabel !== orderData.shipping_label_url;
    const hasShipmentIdChange = finalShipmentId && finalShipmentId !== orderData.shipping_shipment_id;
    const hasChanges = hasTrackingChange || hasLabelChange || hasShipmentIdChange;

    const nowIso = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      updated_at: nowIso,
    };

    const metadata = (orderData.metadata as Record<string, unknown>) || {};
    const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
    const updatedShippingMeta: Record<string, unknown> = {
      ...shippingMeta,
    };

    // Guardar shipment_id en columna dedicada (SIEMPRE si no está) y en metadata
    if (finalShipmentId) {
      if (!orderData.shipping_shipment_id) {
        updateData.shipping_shipment_id = finalShipmentId;
      }
      updatedShippingMeta.shipment_id = finalShipmentId;
    }

    // Espejar columnas -> metadata (siempre, no solo cuando hay cambios)
    const finalTracking = hasTrackingChange
      ? extractedTracking!.trim()
      : orderData.shipping_tracking_number || (shippingMeta.tracking_number as string | null) || null;
    const finalLabel = hasLabelChange
      ? extractedLabel!.trim()
      : orderData.shipping_label_url || (shippingMeta.label_url as string | null) || null;

    // Actualizar tracking/label solo si hay cambios Y el nuevo valor no es null/empty
    // NO sobreescribir valores existentes con null
    if (hasTrackingChange) {
      updateData.shipping_tracking_number = finalTracking;
    }
    if (hasLabelChange) {
      updateData.shipping_label_url = finalLabel;
    }
    // Espejar columnas a metadata siempre (incluso si no hay cambios)
    if (finalTracking) {
      updatedShippingMeta.tracking_number = finalTracking;
    }
    if (finalLabel) {
      updatedShippingMeta.label_url = finalLabel;
    }

    // Actualizar shipping_status según disponibilidad de tracking/label/columns
    const statusFromColumns = (orderData as { shipping_status?: string | null }).shipping_status || null;
    let nextStatus: string | null = statusFromColumns || null;
    if (finalTracking && finalLabel) {
      nextStatus = "label_created";
    } else if (finalTracking || finalLabel || finalShipmentId) {
      nextStatus = "label_pending_tracking";
    }
    if (nextStatus) {
      const statusChanged = nextStatus !== orderData.shipping_status;
      // NOTA: shipping_status_updated_at no existe como columna, se guarda en metadata.shipping._last_write.at
      if (statusChanged) {
        updateData.shipping_status = nextStatus;
      }
      // Espejar status a metadata siempre (desde columnas o nuevo)
      updatedShippingMeta.shipping_status = nextStatus;
    }

    // label_creation evidencia si ya hay tracking/label/status
    if (finalTracking || finalLabel || nextStatus === "label_created" || nextStatus === "label_pending_tracking") {
      const prevLabelCreation = (shippingMeta.label_creation as {
        status?: string | null;
        started_at?: string | null;
        finished_at?: string | null;
        request_id?: string | null;
      }) || {};
      updatedShippingMeta.label_creation = {
        status: "created",
        started_at: prevLabelCreation.started_at || prevLabelCreation.finished_at || nowIso,
        finished_at: nowIso,
        request_id: prevLabelCreation.request_id || null,
      };
    }

    // Normalizar metadata con pricing/rate_used canónicos antes de persistir
    const updatedMetadata: Record<string, unknown> = {
      ...metadata,
      shipping: updatedShippingMeta,
    };
    const normalizedMeta = normalizeShippingMetadata(updatedMetadata, {
      source: "admin",
      orderId,
    });
    
    // CRÍTICO: Releer metadata justo antes del update para evitar race conditions
    const { data: freshOrderData } = await supabase
      .from("orders")
      .select("metadata, updated_at")
      .eq("id", orderId)
      .single();
    
    const freshMetadata = (freshOrderData?.metadata as Record<string, unknown>) || {};
    const freshUpdatedAt = freshOrderData?.updated_at as string | null | undefined;
    
    // Re-normalizar después del merge
    const mergedMetadata: Record<string, unknown> = {
      ...freshMetadata,
      shipping: updatedShippingMeta,
    };
    const finalMergedNormalized = normalizeShippingMetadata(mergedMetadata, {
      source: "admin",
      orderId,
    });
    
    // Usar SOLO el resultado normalizado (nunca mezclar con updatedMetadata)
    const metadataWithPricing: Record<string, unknown> = {
      ...mergedMetadata,
      ...(finalMergedNormalized.shippingPricing ? { shipping_pricing: finalMergedNormalized.shippingPricing } : {}),
    };
    
    const normalizedWithDebug = {
      ...metadataWithPricing,
      shipping: addShippingMetadataDebug(finalMergedNormalized.shippingMeta, "sync-label", metadataWithPricing),
    };
    
    // Aplicar preserveRateUsed para garantizar que rate_used nunca quede null
    const finalMetadataWithPreserve = preserveRateUsed(freshMetadata, normalizedWithDebug);
    
    // CRÍTICO: Asegurar que rate_used esté presente en el payload final antes de escribir
    let finalMetadata = ensureRateUsedInMetadata(finalMetadataWithPreserve);

    // CRÍTICO: Aplicar mergeRateUsedPreserveCents JUSTO antes de persistir
    const { mergeRateUsedPreserveCents } = await import("@/lib/shipping/mergeRateUsedPreserveCents");
    const { sanitizeForLog } = await import("@/lib/utils/sanitizeForLog");
    const finalShippingMeta = (finalMetadata.shipping as Record<string, unknown>) || {};
    const finalRateUsed = (finalShippingMeta.rate_used as Record<string, unknown>) || {};
    const finalShippingPricing = finalMetadata.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
      customer_total_cents?: number | null;
    } | null | undefined;
    
    // Merge preservando cents
    const mergedRateUsed = mergeRateUsedPreserveCents(
      finalRateUsed,
      finalRateUsed,
      finalShippingPricing,
    );
    
    // Actualizar metadata con rate_used mergeado
    finalMetadata = {
      ...finalMetadata,
      shipping: {
        ...finalShippingMeta,
        rate_used: mergedRateUsed,
      },
    };

    // CRÍTICO: Log del objeto EXACTO que se pasa a .update()
    const exactMetadataToDb = finalMetadata;
    const exactShippingMeta = (exactMetadataToDb.shipping as Record<string, unknown>) || {};
    const exactRateUsed = (exactShippingMeta.rate_used as Record<string, unknown>) || null;
    const exactPricing = exactMetadataToDb.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
    } | null | undefined;
    const exactLastWrite = (exactShippingMeta._last_write as { route?: string }) || {};
    
    const sanitizedOrderId = sanitizeForLog(orderId);
    console.log("[sync-label] FINAL_METADATA_TO_DB (objeto EXACTO que entra a .update())", {
      orderId: sanitizedOrderId,
      lastWriteRoute: exactLastWrite.route ?? null,
      rateUsedPriceCents: exactRateUsed?.price_cents ?? null,
      rateUsedCarrierCents: exactRateUsed?.carrier_cents ?? null,
      rateUsedCustomerTotalCents: exactRateUsed?.customer_total_cents ?? null,
      pricingTotalCents: exactPricing?.total_cents ?? null,
      pricingCarrierCents: exactPricing?.carrier_cents ?? null,
      rateUsedKeys: exactRateUsed ? Object.keys(exactRateUsed) : [],
    });
    
    // INSTRUMENTACIÓN PRE-WRITE
    logPreWrite("sync-label", orderId, freshMetadata, freshUpdatedAt, finalMetadata);
    
    updateData.metadata = finalMetadata;

    // Detectar si metadata difiere de columnas (necesita sync)
    const metadataBeforeShipping = (orderData.metadata as { shipping?: Record<string, unknown> } | null)?.shipping || {};
    const metadataDiffersFromColumns =
      (finalTracking && metadataBeforeShipping?.tracking_number !== finalTracking) ||
      (finalLabel && metadataBeforeShipping?.label_url !== finalLabel) ||
      (nextStatus && metadataBeforeShipping?.shipping_status !== nextStatus) ||
      (finalShipmentId && metadataBeforeShipping?.shipment_id !== finalShipmentId);

    // Solo actualizar si hay cambios reales (columns o metadata)
    const hasRealChanges =
      hasChanges ||
      updateData.shipping_shipment_id ||
      hasTrackingChange ||
      hasLabelChange ||
      Boolean(updateData.shipping_status) ||
      Boolean(normalizedMeta.mismatchDetected) ||
      Boolean(normalizedMeta.corrected) ||
      metadataDiffersFromColumns;

    if (hasRealChanges) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId)
        .select("id, metadata, updated_at")
        .single();

      if (updateError) {
        // Structured logging: primer argumento constante, error sanitizado en objeto
        console.error("[sync-label] Error al actualizar orden", {
          errorCode: updateError.code ?? null,
          errorMessage: sanitizeForLog(updateError.message),
          errorDetails: sanitizeForLog(updateError.details),
          errorHint: sanitizeForLog(updateError.hint),
        });
      } else {
        // CRÍTICO: Reread post-write para verificar persistencia real en DB (RAW, sin normalizadores)
        const { data: rereadOrder, error: rereadError } = await supabase
          .from("orders")
          .select("id, updated_at, metadata")
          .eq("id", orderId)
          .single();

        if (rereadError) {
          // Structured logging: primer argumento constante, error sanitizado en objeto
          console.error("[sync-label] Error al releer orden post-write", {
            errorCode: rereadError.code ?? null,
            errorMessage: sanitizeForLog(rereadError.message),
            errorDetails: sanitizeForLog(rereadError.details),
            errorHint: sanitizeForLog(rereadError.hint),
          });
        } else {
          // RAW_DB: Leer directamente sin normalizadores/helpers
          const rawDbMetadata = rereadOrder?.metadata as Record<string, unknown> | null | undefined;
          const rawDbShipping = (rawDbMetadata?.shipping as Record<string, unknown>) || null;
          const rawDbRateUsed = (rawDbShipping?.rate_used as Record<string, unknown>) || null;
          const rawDbPricing = (rawDbMetadata?.shipping_pricing as Record<string, unknown>) || null;

          // RAW_DB reread log
          console.log("[sync-label] RAW_DB reread (post-write, sin normalizadores)", {
            orderId: sanitizedOrderId,
            updatedAt: rereadOrder?.updated_at ?? null,
            metadataShippingRateUsedPriceCents: rawDbRateUsed?.price_cents ?? null,
            metadataShippingRateUsedCarrierCents: rawDbRateUsed?.carrier_cents ?? null,
            metadataShippingPricingTotalCents: rawDbPricing?.total_cents ?? null,
            metadataShippingPricingCarrierCents: rawDbPricing?.carrier_cents ?? null,
            metadataShippingRateUsedFull: rawDbRateUsed,
          });

          // DB_VERIFICATION log
          const dbPriceCents = rawDbRateUsed?.price_cents ?? null;
          const dbCarrierCents = rawDbRateUsed?.carrier_cents ?? null;
          const dbPricingTotalCents = rawDbPricing?.total_cents ?? null;
          const dbPricingCarrierCents = rawDbPricing?.carrier_cents ?? null;
          
          console.log("[sync-label] DB_VERIFICATION (simulando SQL paths)", {
            orderId: sanitizedOrderId,
            "db.metadata #>> '{shipping,rate_used,price_cents}'": dbPriceCents,
            "db.metadata #>> '{shipping,rate_used,carrier_cents}'": dbCarrierCents,
            "db.metadata #>> '{shipping_pricing,total_cents}'": dbPricingTotalCents,
            "db.metadata #>> '{shipping_pricing,carrier_cents}'": dbPricingCarrierCents,
            beforeUpdateHadNumbers: exactRateUsed && (
              (exactRateUsed.price_cents != null && exactRateUsed.price_cents !== null) ||
              (exactRateUsed.carrier_cents != null && exactRateUsed.carrier_cents !== null)
            ),
            afterUpdateHasNumbers: rawDbRateUsed && (
              (rawDbRateUsed.price_cents != null && rawDbRateUsed.price_cents !== null) ||
              (rawDbRateUsed.carrier_cents != null && rawDbRateUsed.carrier_cents !== null)
            ),
            discrepancy: (exactRateUsed && (
              (exactRateUsed.price_cents != null && exactRateUsed.price_cents !== null) ||
              (exactRateUsed.carrier_cents != null && exactRateUsed.carrier_cents !== null)
            )) && !(rawDbRateUsed && (
              (rawDbRateUsed.price_cents != null && rawDbRateUsed.price_cents !== null) ||
              (rawDbRateUsed.carrier_cents != null && rawDbRateUsed.carrier_cents !== null)
            )),
          });
        }
      }
      
      // INSTRUMENTACIÓN POST-WRITE (usar reread para valores reales de DB)
      const postWriteMetadata = (rereadOrder?.metadata || updatedOrder?.metadata) as Record<string, unknown> || {};
      const postWriteUpdatedAt = updatedOrder?.updated_at as string | null | undefined;
      logPostWrite("sync-label", orderId, postWriteMetadata, postWriteUpdatedAt);

      // Gate estricto: enviar email solo con evidencia real de guía
      const hasLabelUrlEvidence =
        Boolean(finalLabel) ||
        Boolean(updateData.shipping_label_url) ||
        Boolean((updateData.metadata as { shipping?: { label_url?: string | null } }).shipping?.label_url);
      const labelCreationStatus =
        ((updateData.metadata as { shipping?: { label_creation?: { status?: string | null } } }).shipping
          ?.label_creation?.status as string | null) || null;
      const hasLabelCreationCreated = labelCreationStatus === "created";
      const finalShippingStatus =
        (updateData.shipping_status as string | undefined) ||
        ((updateData.metadata as { shipping?: { shipping_status?: string | null } }).shipping?.shipping_status as string | undefined) ||
        null;
      const hasShippingStatusEvidence =
        finalShippingStatus === "label_created" || finalShippingStatus === "label_pending_tracking";

      if (hasLabelUrlEvidence || hasLabelCreationCreated || hasShippingStatusEvidence) {
        try {
          const { sendShippingCreatedEmail } = await import("@/lib/email/orderEmails");
          const emailResult = await sendShippingCreatedEmail(orderId);
          if (!emailResult.ok) {
            console.warn("[sync-label] Error al enviar email de envío generado:", emailResult.error);
          } else if (emailResult.sent) {
            console.log("[sync-label] Email de envío generado enviado:", orderId);
          }
        } catch (emailError) {
          console.error("[sync-label] Error inesperado al enviar email:", emailError);
          // No fallar si falla el email
        }
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
