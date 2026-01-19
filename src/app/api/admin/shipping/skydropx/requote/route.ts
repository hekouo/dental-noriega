import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { getSkydropxRates } from "@/lib/shipping/skydropx.server";
import { normalizeSkydropxRates } from "@/lib/shipping/normalizeSkydropxRates";
import type { SkydropxRate } from "@/lib/shipping/skydropx.server";
import { getOrderShippingAddress } from "@/lib/shipping/getOrderShippingAddress";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type RequoteResponse =
  | {
      ok: true;
      rates: Array<{
        external_id: string;
        provider: string;
        service: string;
        option_code?: string;
        eta_min_days: number | null;
        eta_max_days: number | null;
        price_cents: number;
      }>;
      diagnostic?: {
        origin: {
          postal_code_present: boolean;
          city: string;
          state: string;
          country_code: string;
          street1_len: number;
        };
        destination: {
          postal_code_present: boolean;
          city: string;
          state: string;
          country_code: string;
          street1_len: number;
        };
        pkg: {
          length_cm: number;
          width_cm: number;
          height_cm: number;
          weight_g: number; // Peso final usado (después de clamp)
          was_clamped: boolean; // Si el peso fue ajustado al mínimo
          min_billable_weight_g: number; // Mínimo billable usado (para diagnóstico)
        };
        usedSources: {
          origin: "config" | "provided";
          destination: "normalized" | "raw";
          package: "provided" | "default";
        };
      };
      emptyReason?: "skydropx_no_rates";
    }
  | {
      ok: false;
      code: "quotation_pending";
      message: string;
      quotationId?: string;
      isCompleted?: boolean;
      pollingInfo?: { attempts: number; elapsedMs: number };
      diagnostic?: any;
    }
  | {
      ok: false;
      code: string;
      message: string;
      reason?: string;
      missingFields?: string[];
    };


/**
 * POST /api/admin/shipping/skydropx/requote
 * 
 * Recotiza envío para una orden existente
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
        } satisfies RequoteResponse,
        { status: 401 },
      );
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "orderId es requerido.",
        } satisfies RequoteResponse,
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
        } satisfies RequoteResponse,
        { status: 404 },
      );
    }

    // Validar shipping_provider=skydropx y shipping_method != pickup
    if (order.shipping_provider !== "skydropx" && order.shipping_provider !== "Skydropx") {
      return NextResponse.json(
        {
          ok: false,
          code: "requote_precondition_failed",
          message: "Esta orden no usa Skydropx como proveedor de envío.",
          reason: "unsupported_provider",
        } satisfies RequoteResponse,
        { status: 400 },
      );
    }

    // Validar que no sea pickup (está en metadata.shipping_method)
    const orderMetadata = (order.metadata as Record<string, unknown>) || {};
    const shippingMethod = orderMetadata.shipping_method;
    if (shippingMethod === "pickup") {
      return NextResponse.json(
        {
          ok: false,
          code: "requote_precondition_failed",
          message: "No se pueden recotizar envíos de recogida en tienda.",
          reason: "pickup_not_quotable",
        } satisfies RequoteResponse,
        { status: 400 },
      );
    }

    const shippingAddressResult = getOrderShippingAddress(order);
    if (process.env.NODE_ENV !== "production") {
      console.log("[requote] Shipping address source:", {
        has_shipping_address: Boolean(shippingAddressResult),
        source_key_used: shippingAddressResult?.sourceKey || null,
      });
    }
    if (!shippingAddressResult) {
      return NextResponse.json(
        {
          ok: false,
          code: "missing_shipping_address",
          message: "Falta dirección en la orden.",
        } satisfies RequoteResponse,
        { status: 400 },
      );
    }

    const addressTo = {
      postalCode: shippingAddressResult.address.postalCode,
      state: shippingAddressResult.address.state,
      city: shippingAddressResult.address.city,
      country: shippingAddressResult.address.country,
      address1: shippingAddressResult.address.address1,
      address2: shippingAddressResult.address.address2 ?? undefined,
    };

    // Obtener package desde metadata.shipping_package o usar default
    const shippingPackage = orderMetadata.shipping_package as
      | {
          mode?: "profile" | "custom";
          profile?: string | null;
          length_cm?: number;
          width_cm?: number;
          height_cm?: number;
          weight_g?: number;
        }
      | undefined;

    let weightGrams: number;
    let lengthCm: number;
    let widthCm: number;
    let heightCm: number;
    let hasPackageWarning = false;

    if (
      shippingPackage &&
      typeof shippingPackage.weight_g === "number" &&
      typeof shippingPackage.length_cm === "number" &&
      typeof shippingPackage.width_cm === "number" &&
      typeof shippingPackage.height_cm === "number"
    ) {
      // Usar package guardado con hardening (valores mínimos razonables)
      // Skydropx requiere/cobra mínimo 1kg (1000g) para cotizaciones y envíos
      const MIN_BILLABLE_WEIGHT_G = parseInt(
        process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000",
        10,
      );
      weightGrams = Math.max(shippingPackage.weight_g, MIN_BILLABLE_WEIGHT_G); // Mínimo 1kg (1000g)
      lengthCm = Math.max(shippingPackage.length_cm, 1); // Mínimo 1cm
      widthCm = Math.max(shippingPackage.width_cm, 1); // Mínimo 1cm
      heightCm = Math.max(shippingPackage.height_cm, 1); // Mínimo 1cm
    } else {
      // Usar default (BOX_S: 25x20x15 cm, 150g base)
      weightGrams = 1000; // 1kg total (incluyendo productos)
      lengthCm = 25;
      widthCm = 20;
      heightCm = 15;
      hasPackageWarning = true;
    }

    // Llamar a Skydropx para obtener rates (usando builder unificado con diagnóstico)
    // SIEMPRE pedir diagnóstico para poder diagnosticar cuando rates está vacío
    let ratesResult;
    try {
      ratesResult = await getSkydropxRates(
        {
          postalCode: addressTo.postalCode,
          state: addressTo.state,
          city: addressTo.city,
          country: addressTo.country,
          address1: addressTo.address1, // Pasar address1 (calle) al builder
          address2: addressTo.address2, // Pasar address2 (colonia) al builder para area_level3
        },
        {
          weightGrams,
          lengthCm,
          widthCm,
          heightCm,
        },
        {
          diagnostic: true, // SIEMPRE incluir diagnóstico en admin
        },
      );
    } catch (error: any) {
      // Manejar error de quotation_pending
      if (error instanceof Error && error.message === "skydropx_quotation_pending") {
        const errorAny = error as any;
        const quotationId = errorAny.quotationId;
        const isCompleted = errorAny.isCompleted ?? false;
        const pollingInfo = errorAny.pollingInfo;
        
        return NextResponse.json({
          ok: false,
          code: "quotation_pending",
          message: "La cotización está en progreso. Por favor, reintenta en unos momentos.",
          quotationId,
          isCompleted,
          pollingInfo,
          diagnostic: {
            origin: {
              postal_code_present: false,
              city: "[unknown]",
              state: "[unknown]",
              country_code: "MX",
              street1_len: 0,
              area_level3_len: 0,
              area_level3_source: "none",
            },
            destination: {
              postal_code_present: !!addressTo.postalCode && addressTo.postalCode.length > 0,
              city: addressTo.city || "[missing]",
              state: addressTo.state || "[missing]",
              country_code: addressTo.country || "MX",
              street1_len: addressTo.address1 ? addressTo.address1.length : 0,
              area_level3_len: addressTo.address2 ? addressTo.address2.length : 0,
              area_level3_source: addressTo.address2 ? "address2" : "none",
            },
            pkg: {
              length_cm: lengthCm,
              width_cm: widthCm,
              height_cm: heightCm,
              weight_g: weightGrams,
              was_clamped: false,
              min_billable_weight_g: parseInt(process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000", 10),
            },
            quotation: {
              quotation_id: quotationId,
              is_completed: isCompleted,
              polling_attempts: pollingInfo?.attempts ?? 0,
              polling_elapsed_ms: pollingInfo?.elapsedMs ?? 0,
              rates_count_raw: 0,
              rates_count_filtered: 0,
              rates_by_status: {},
            },
            usedSources: {
              origin: "config",
              destination: "normalized",
              package: hasPackageWarning ? "default" : "provided",
            },
          },
        } satisfies RequoteResponse & { quotationId?: string; isCompleted?: boolean; pollingInfo?: { attempts: number; elapsedMs: number } });
      }
      // Re-lanzar otros errores
      throw error;
    }

    // Extraer rates y diagnóstico
    const rates = Array.isArray(ratesResult) ? ratesResult : ratesResult.rates;
    const diagnostic = Array.isArray(ratesResult) ? undefined : ratesResult.diagnostic;

    const normalizedRates = normalizeSkydropxRates(rates, {
      packagingCents: 2000,
      marginPercent: 0.05,
      marginCapCents: 3000,
      mode: "admin",
    }).map((rate) => ({
      external_id: rate.external_id,
      provider: rate.provider,
      service: rate.service,
      option_code: rate.option_code,
      eta_min_days: rate.eta_min_days,
      eta_max_days: rate.eta_max_days,
      price_cents: rate.carrier_cents,
      carrier_cents: rate.carrier_cents,
      margin_cents: rate.margin_cents ?? null,
      customer_total_cents: rate.customer_total_cents ?? null,
    }));

    // SIEMPRE construir diagnóstico normalizado (cuando se solicita, siempre debe estar disponible)
    const normalizedDiagnostic = diagnostic
      ? {
          origin: {
            postal_code_present: diagnostic.origin.postal_code_present,
            city: diagnostic.origin.city?.trim() || "[missing]",
            state: diagnostic.origin.state?.trim() || "[missing]",
            country_code: diagnostic.origin.country_code || "MX",
            street1_len: diagnostic.origin.street1_len,
            area_level3_len: diagnostic.origin.area_level3_len ?? 0,
            area_level3_source: diagnostic.origin.area_level3_source ?? "none",
          },
          destination: {
            postal_code_present: diagnostic.destination.postal_code_present,
            city: diagnostic.destination.city?.trim() || "[missing]",
            state: diagnostic.destination.state?.trim() || "[missing]",
            country_code: diagnostic.destination.country_code || "MX",
            street1_len: diagnostic.destination.street1_len,
            area_level3_len: diagnostic.destination.area_level3_len ?? 0,
            area_level3_source: diagnostic.destination.area_level3_source ?? "none",
          },
          pkg: {
            length_cm: diagnostic.pkg.length_cm,
            width_cm: diagnostic.pkg.width_cm,
            height_cm: diagnostic.pkg.height_cm,
            weight_g: diagnostic.pkg.weight_g, // Peso final usado (después de clamp)
            was_clamped: diagnostic.pkg.was_clamped ?? false, // Si el peso fue ajustado al mínimo
            min_billable_weight_g: diagnostic.pkg.min_billable_weight_g ?? 1000, // Mínimo billable usado
          },
          usedSources: diagnostic.usedSources,
          quotation: diagnostic.quotation,
        }
      : null;

    // GARANTIZAR: Si rates está vacío, SIEMPRE devolver diagnostic (incluso si viene null, construir uno mínimo)
    const isEmpty = normalizedRates.length === 0;
    const finalDiagnostic = isEmpty && normalizedDiagnostic 
      ? normalizedDiagnostic 
      : isEmpty && !normalizedDiagnostic
        ? {
            origin: {
              postal_code_present: false,
              city: "[unknown]",
              state: "[unknown]",
              country_code: "MX",
              street1_len: 0,
              area_level3_len: 0,
              area_level3_source: "none",
            },
            destination: {
              postal_code_present: !!addressTo.postalCode && addressTo.postalCode.length > 0,
              city: addressTo.city || "[missing]",
              state: addressTo.state || "[missing]",
              country_code: addressTo.country || "MX",
              street1_len: 0,
              area_level3_len: 0,
              area_level3_source: "none",
            },
            pkg: {
              length_cm: lengthCm,
              width_cm: widthCm,
              height_cm: heightCm,
              weight_g: weightGrams,
              was_clamped: false, // No clampado en este path (fallback diagnóstico mínimo)
              min_billable_weight_g: parseInt(process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000", 10),
            },
            usedSources: {
              origin: "config",
              destination: "normalized",
              package: hasPackageWarning ? "default" : "provided",
            },
            quotation: {
              quotation_id: null,
              host_used: null,
              is_completed: true,
              polling_attempts: 0,
              polling_elapsed_ms: 0,
            },
          }
        : undefined;

    // Detectar si el peso fue clampado al mínimo billable (desde diagnóstico normalizado)
    const wasWeightClamped = normalizedDiagnostic?.pkg.was_clamped ?? false;
    const minBillableWeightG = normalizedDiagnostic?.pkg.min_billable_weight_g ?? 1000;
    const weightWarning = wasWeightClamped
      ? `Skydropx requiere/cobra mínimo ${minBillableWeightG}g (1kg). Se cotizó con ${minBillableWeightG}g (${minBillableWeightG / 1000}kg).`
      : undefined;

    // Log diagnóstico cuando rates está vacío (sin PII)
    if (isEmpty && finalDiagnostic) {
      console.warn("[requote] 0 rates devueltos por Skydropx", {
        diagnostic: {
          origin: {
            postal_code: finalDiagnostic.origin.postal_code_present,
            city: finalDiagnostic.origin.city,
            state: finalDiagnostic.origin.state,
            area_level3_len: finalDiagnostic.origin.area_level3_len ?? 0,
            area_level3_source: finalDiagnostic.origin.area_level3_source ?? "none",
          },
          destination: {
            postal_code: finalDiagnostic.destination.postal_code_present,
            city: finalDiagnostic.destination.city,
            state: finalDiagnostic.destination.state,
            area_level3_len: finalDiagnostic.destination.area_level3_len ?? 0,
            area_level3_source: finalDiagnostic.destination.area_level3_source ?? "none",
          },
          pkg: {
            weight_g: finalDiagnostic.pkg.weight_g,
            was_clamped: finalDiagnostic.pkg.was_clamped,
          },
        },
        weightClamped: wasWeightClamped,
      });
    }

    // Combinar warnings (empaque y peso)
    const packageWarning = hasPackageWarning
      ? "No se encontró empaque guardado, usando dimensiones por defecto. Selecciona un empaque antes de recotizar para obtener tarifas precisas."
      : undefined;
    const combinedWarning = [packageWarning, weightWarning].filter(Boolean).join(" ");

    // Solo devolver emptyReason cuando is_completed === true y rates está vacío
    const quotationInfo = normalizedDiagnostic ? (normalizedDiagnostic as any).quotation : undefined;
    const isCompleted = quotationInfo?.is_completed ?? true; // Si no viene, asumir completada
    const shouldReturnEmptyReason = isEmpty && isCompleted;

    // Persistir quotation_id, host y quoted_package para reutilizar en create-label (sin PII)
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const metadataShipping = (orderMetadata.shipping as Record<string, unknown>) || {};
        const quotationData = (finalDiagnostic?.quotation ||
          normalizedDiagnostic?.quotation ||
          {}) as {
          quotation_id?: string | null;
          host_used?: string | null;
        };
        const updatedShipping = {
          ...metadataShipping,
          quotation_id: quotationData.quotation_id || metadataShipping.quotation_id || null,
          quotation_host_used: quotationData.host_used || metadataShipping.quotation_host_used || null,
          quoted_package: {
            weight_g: weightGrams,
            length_cm: lengthCm,
            width_cm: widthCm,
            height_cm: heightCm,
            source: hasPackageWarning ? "default" : "provided",
          },
        };
        const updatedMetadata = {
          ...orderMetadata,
          shipping: updatedShipping,
        };
        await supabase
          .from("orders")
          .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
          .eq("id", orderId);
      }
    } catch (persistError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[requote] No se pudo persistir quotation/quoted_package:", persistError);
      }
    }
    
    return NextResponse.json({
      ok: true,
      rates: normalizedRates,
      // SIEMPRE incluir diagnóstico cuando rates está vacío (sin depender de NODE_ENV)
      diagnostic: isEmpty ? finalDiagnostic : undefined,
      emptyReason: shouldReturnEmptyReason ? "skydropx_no_rates" : undefined,
      warning: combinedWarning || undefined,
      weightClamped: wasWeightClamped, // Flag adicional para UI
    } satisfies RequoteResponse & { warning?: string; weightClamped?: boolean });
  } catch (error) {
    console.error("[requote] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Error al recotizar el envío. Revisa los logs.",
      } satisfies RequoteResponse,
      { status: 500 },
    );
  }
}
