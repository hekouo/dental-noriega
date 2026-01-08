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
          city_len: number;
          state_len: number;
          street1_len: number;
          country: string;
        };
        destination: {
          postal_code_present: boolean;
          city_len: number;
          state_len: number;
          street1_len: number;
          country: string;
        };
        pkg: {
          length_cm: number;
          width_cm: number;
          height_cm: number;
          weight_g: number;
          weight_kg: number;
        };
        usedSources: {
          origin: "config" | "provided";
          destination: "normalized" | "raw";
          package: "provided" | "default";
        };
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
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
          code: "unsupported_provider",
          message: "Esta orden no usa Skydropx como proveedor de envío.",
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
          code: "pickup_not_quotable",
          message: "No se pueden recotizar envíos de recogida en tienda.",
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
          code: "missing_address_data",
          message: "No se encontraron datos de dirección en la orden.",
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
      // Usar package guardado
      weightGrams = shippingPackage.weight_g;
      lengthCm = shippingPackage.length_cm;
      widthCm = shippingPackage.width_cm;
      heightCm = shippingPackage.height_cm;
    } else {
      // Usar default (BOX_S: 25x20x15 cm, 150g base)
      weightGrams = 1000; // 1kg total (incluyendo productos)
      lengthCm = 25;
      widthCm = 20;
      heightCm = 15;
      hasPackageWarning = true;
    }

    // Llamar a Skydropx para obtener rates (usando builder unificado con diagnóstico)
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
        diagnostic: true, // Siempre incluir diagnóstico en admin
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

    // Log diagnóstico cuando rates está vacío (sin PII)
    if (normalizedRates.length === 0 && diagnostic) {
      console.warn("[requote] 0 rates devueltos por Skydropx", {
        diagnostic: {
          origin: {
            postal_code_present: diagnostic.origin.postal_code_present,
            city_len: diagnostic.origin.city_len,
            state_len: diagnostic.origin.state_len,
            country: diagnostic.origin.country,
          },
          destination: {
            postal_code_present: diagnostic.destination.postal_code_present,
            city_len: diagnostic.destination.city_len,
            state_len: diagnostic.destination.state_len,
            country: diagnostic.destination.country,
          },
          pkg: diagnostic.pkg,
          usedSources: diagnostic.usedSources,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      rates: normalizedRates,
      diagnostic: normalizedRates.length === 0 ? diagnostic : undefined, // Solo incluir diagnóstico si rates está vacío
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
