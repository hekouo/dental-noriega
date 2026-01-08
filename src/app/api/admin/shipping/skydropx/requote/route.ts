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
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

/**
 * Extrae dirección de destino desde metadata (reutiliza lógica de create-label)
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

  // PRIORIDAD 1: metadata.shipping_address (nuevo formato estructurado)
  let addressData: Record<string, unknown> | null = null;
  if (meta.shipping_address && typeof meta.shipping_address === "object") {
    addressData = meta.shipping_address as Record<string, unknown>;
  }
  // PRIORIDAD 2: metadata.shipping.address (compatibilidad)
  else if (meta.shipping && typeof meta.shipping === "object") {
    const shipping = meta.shipping as Record<string, unknown>;
    if (shipping.address && typeof shipping.address === "object") {
      addressData = shipping.address as Record<string, unknown>;
    }
  }
  // PRIORIDAD 3: metadata.address (legacy)
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
    const metadata = (order.metadata as Record<string, unknown>) || {};
    const shippingMethod = metadata.shipping_method;
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

    // Construir package template (usar defaults: 1kg, 20x20x10 cm)
    // TODO: Mejorar calculando desde order_items si están disponibles
    const weightGrams = 1000; // Default 1kg

    // Llamar a Skydropx para obtener rates
    const rates = await getSkydropxRates(
      {
        postalCode: addressTo.postalCode,
        state: addressTo.state,
        city: addressTo.city,
        country: addressTo.country,
      },
      {
        weightGrams,
      },
    );

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

    return NextResponse.json({
      ok: true,
      rates: normalizedRates,
    } satisfies RequoteResponse);
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
