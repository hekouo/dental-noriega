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
          weight_g: number;
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
 * PRIORIDAD: shipping_address_override > shipping_address > shipping.address > address
 */
function extractAddressFromMetadata(metadata: unknown): {
  postalCode: string;
  state: string;
  city: string;
  country: string;
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
  // PRIORIDAD 3: metadata.shipping.address (compatibilidad)
  else if (meta.shipping && typeof meta.shipping === "object") {
    const shipping = meta.shipping as Record<string, unknown>;
    if (shipping.address && typeof shipping.address === "object") {
      addressData = shipping.address as Record<string, unknown>;
    }
  }
  // PRIORIDAD 4: metadata.address (legacy)
  else if (meta.address && typeof meta.address === "object") {
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

  // Validar campos mínimos requeridos
  if (
    typeof postalCode === "string" &&
    typeof state === "string" &&
    typeof city === "string" &&
    postalCode.length > 0 &&
    state.length > 0 &&
    city.length > 0
  ) {
    return {
      postalCode,
      state,
      city,
      country: typeof country === "string" ? country : "MX",
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
      weightGrams = Math.max(shippingPackage.weight_g, 50); // Mínimo 50g
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

    // Normalizar diagnóstico para incluir city/state (sin PII completo)
    const normalizedDiagnostic = diagnostic
      ? {
          origin: {
            postal_code_present: diagnostic.origin.postal_code_present,
            city: diagnostic.origin.city_len > 0 ? "[present]" : "[missing]",
            state: diagnostic.origin.state_len > 0 ? "[present]" : "[missing]",
            country_code: diagnostic.origin.country,
            street1_len: diagnostic.origin.street1_len,
          },
          destination: {
            postal_code_present: diagnostic.destination.postal_code_present,
            city: diagnostic.destination.city_len > 0 ? "[present]" : "[missing]",
            state: diagnostic.destination.state_len > 0 ? "[present]" : "[missing]",
            country_code: diagnostic.destination.country,
            street1_len: diagnostic.destination.street1_len,
          },
          pkg: {
            length_cm: diagnostic.pkg.length_cm,
            width_cm: diagnostic.pkg.width_cm,
            height_cm: diagnostic.pkg.height_cm,
            weight_g: diagnostic.pkg.weight_g,
          },
          usedSources: diagnostic.usedSources,
        }
      : undefined;

    // Log diagnóstico cuando rates está vacío (sin PII)
    if (normalizedRates.length === 0 && normalizedDiagnostic) {
      console.warn("[requote] 0 rates devueltos por Skydropx", {
        diagnostic: normalizedDiagnostic,
      });
    }

    return NextResponse.json({
      ok: true,
      rates: normalizedRates,
      diagnostic: normalizedRates.length === 0 ? normalizedDiagnostic : undefined, // Solo incluir diagnóstico si rates está vacío
      emptyReason: normalizedRates.length === 0 ? "skydropx_no_rates" : undefined,
      warning: hasPackageWarning
        ? "No se encontró empaque guardado, usando dimensiones por defecto. Selecciona un empaque antes de recotizar para obtener tarifas precisas."
        : undefined,
    } satisfies RequoteResponse & { warning?: string });
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
