import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { getSkydropxRates } from "@/lib/shipping/skydropx.server";
import type { SkydropxRate } from "@/lib/shipping/skydropx.server";

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
      code: string;
      message: string;
      reason?: string;
      missingFields?: string[];
    };

/**
 * Extrae dirección de destino desde metadata (mismo orden que create-label)
 * PRIORIDAD: shipping_address_override > shipping_address > shipping.address_validation.normalized_address > shipping.address > address
 * 
 * Fallbacks robustos para address1:
 * 1) shipping_address_override.address1
 * 2) shipping_address.address1
 * 3) shipping.address_validation.normalized_address.address1
 * 4) shipping.address.address1
 * 5) address.address1 (legacy)
 * 6) (último recurso) shipping_address.address2 (solo si address1 vacío)
 */
function extractAddressFromMetadata(metadata: unknown): {
  postalCode: string;
  state: string;
  city: string;
  country: string;
  address1: string;
  address2?: string; // Colonia/barrio (para area_level3)
} | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const meta = metadata as Record<string, unknown>;

  // PRIORIDAD 1: metadata.shipping_address_override (override manual en admin)
  let addressData: Record<string, unknown> | null = null;
  if (meta.shipping_address_override && typeof meta.shipping_address_override === "object") {
    addressData = meta.shipping_address_override as Record<string, unknown>;
  }
  // PRIORIDAD 2: metadata.shipping_address (nuevo formato estructurado)
  else if (meta.shipping_address && typeof meta.shipping_address === "object") {
    addressData = meta.shipping_address as Record<string, unknown>;
  }
  // PRIORIDAD 3: metadata.shipping.address_validation.normalized_address (dirección validada)
  else if (meta.shipping && typeof meta.shipping === "object") {
    const shipping = meta.shipping as Record<string, unknown>;
    if (shipping.address_validation && typeof shipping.address_validation === "object") {
      const addrValidation = shipping.address_validation as Record<string, unknown>;
      if (addrValidation.normalized_address && typeof addrValidation.normalized_address === "object") {
        addressData = addrValidation.normalized_address as Record<string, unknown>;
      }
    }
    // PRIORIDAD 4: metadata.shipping.address (compatibilidad)
    if (!addressData && shipping.address && typeof shipping.address === "object") {
      addressData = shipping.address as Record<string, unknown>;
    }
  }
  // PRIORIDAD 5: metadata.address (legacy)
  if (!addressData && meta.address && typeof meta.address === "object") {
    addressData = meta.address as Record<string, unknown>;
  }

  if (!addressData) {
    return null;
  }

  // Extraer campos con múltiples variantes para compatibilidad
  const postalCode = addressData.postal_code || addressData.cp || addressData.postalCode;
  const state = addressData.state || addressData.estado;
  const city = addressData.city || addressData.ciudad;
  const country = addressData.country || addressData.country_code || "MX";

  // Extraer address1 con fallbacks robustos (calle)
  let address1: string = "";
  if (typeof addressData.address1 === "string") {
    address1 = addressData.address1;
  } else if (typeof addressData.address === "string") {
    address1 = addressData.address;
  } else if (typeof addressData.direccion === "string") {
    address1 = addressData.direccion;
  }
  
  // Si address1 está vacío, intentar fallback a address2 (solo si shipping_address.address2 existe)
  if (!address1 || address1.trim().length === 0) {
    const shippingAddress = meta.shipping_address as Record<string, unknown> | undefined;
    if (shippingAddress && typeof shippingAddress === "object") {
      if (typeof shippingAddress.address2 === "string") {
        address1 = shippingAddress.address2;
      } else if (typeof shippingAddress.address_line2 === "string") {
        address1 = shippingAddress.address_line2;
      }
    }
  }
  
  // Extraer address2 (colonia/barrio) - usado para area_level3 en Skydropx
  // PRIORIDAD: addressData.address2 > shipping_address.address2 > shipping_address.neighborhood
  let address2: string | undefined = undefined;
  if (typeof addressData.address2 === "string" && addressData.address2.trim().length > 0) {
    address2 = addressData.address2.trim();
  } else {
    const shippingAddress = meta.shipping_address as Record<string, unknown> | undefined;
    if (shippingAddress && typeof shippingAddress === "object") {
      if (typeof shippingAddress.address2 === "string" && shippingAddress.address2.trim().length > 0) {
        address2 = shippingAddress.address2.trim();
      } else if (typeof shippingAddress.address_line2 === "string" && shippingAddress.address_line2.trim().length > 0) {
        address2 = shippingAddress.address_line2.trim();
      } else if (typeof shippingAddress.neighborhood === "string" && shippingAddress.neighborhood.trim().length > 0) {
        address2 = shippingAddress.neighborhood.trim();
      }
    }
  }

  // Validar campos mínimos requeridos (ahora incluyendo address1)
  if (
    typeof postalCode === "string" &&
    typeof state === "string" &&
    typeof city === "string" &&
    postalCode.length > 0 &&
    state.length > 0 &&
    city.length > 0
  ) {
    const trimmedAddress1 = address1.trim();
    return {
      postalCode,
      state,
      city,
      country: typeof country === "string" ? country : "MX",
      address1: trimmedAddress1,
      address2: address2, // Colonia/barrio (para area_level3)
    };
  }

  return null;
}

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

    // Extraer dirección de destino desde metadata
    const addressTo = extractAddressFromMetadata(order.metadata);
    if (!addressTo) {
      return NextResponse.json(
        {
          ok: false,
          code: "requote_precondition_failed",
          message: "No se encontraron datos de dirección en la orden.",
          reason: "missing_address_data",
          missingFields: ["postalCode", "state", "city"],
        } satisfies RequoteResponse,
        { status: 400 },
      );
    }

    // Guard: Si address1 está vacío después de todos los fallbacks, fallar con error claro
    if (!addressTo.address1 || addressTo.address1.trim().length === 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "requote_precondition_failed",
          message: "No se encontró dirección (address1) en la orden. La dirección de destino requiere al menos una calle.",
          reason: "missing_destination_street1",
          missingFields: ["destination.address1"],
        } satisfies RequoteResponse,
        { status: 400 },
      );
    }

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
    const ratesResult = await getSkydropxRates(
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

    // Extraer rates y diagnóstico
    const rates = Array.isArray(ratesResult) ? ratesResult : ratesResult.rates;
    const diagnostic = Array.isArray(ratesResult) ? undefined : ratesResult.diagnostic;

    // Normalizar y devolver rates
    const normalizedRates = rates.map((rate: SkydropxRate) => ({
      external_id: rate.externalRateId,
      provider: rate.provider,
      service: rate.service,
      option_code: undefined, // SkydropxRate no incluye option_code por ahora
      eta_min_days: rate.etaMinDays,
      eta_max_days: rate.etaMaxDays,
      price_cents: rate.totalPriceCents,
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

    return NextResponse.json({
      ok: true,
      rates: normalizedRates,
      // SIEMPRE incluir diagnóstico cuando rates está vacío (sin depender de NODE_ENV)
      diagnostic: isEmpty ? finalDiagnostic : undefined,
      emptyReason: isEmpty ? "skydropx_no_rates" : undefined,
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
