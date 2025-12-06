import { NextRequest, NextResponse } from "next/server";
import { getSkydropxRates } from "@/lib/shipping/skydropx.server";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping/freeShipping";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type UiShippingOption = {
  code: string; // p.ej. "skydropx_standard"
  label: string; // p.ej. "Envío a domicilio (2-4 días)"
  priceCents: number;
  provider: "skydropx";
  etaMinDays: number | null;
  etaMaxDays: number | null;
  externalRateId: string; // el rate id original
  originalPriceCents?: number; // Precio original antes de aplicar promo (para mostrar "antes $XXX")
};

type RatesRequest = {
  address: {
    postalCode: string;
    state: string;
    city: string;
    country?: string;
  };
  totalWeightGrams?: number;
  subtotalCents?: number; // Subtotal del carrito en centavos para aplicar promo de envío gratis
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as RatesRequest | null;

    if (!body || !body.address) {
      return NextResponse.json(
        { ok: false, reason: "invalid_destination", error: "Se requiere address con postalCode, state y city" },
        { status: 200 }, // 200 para que el frontend maneje el error
      );
    }

    const { address, totalWeightGrams, subtotalCents } = body;

    if (!address.postalCode || !address.state) {
      return NextResponse.json(
        { ok: false, reason: "invalid_destination", error: "address.postalCode y address.state son requeridos" },
        { status: 200 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[shipping/rates] Request recibida:", {
        postalCode: address.postalCode,
        state: address.state,
        city: address.city,
        country: address.country || "MX",
        totalWeightGrams: totalWeightGrams || 1000,
      });
    }

    // Usar peso total del carrito o fallback razonable (1000g = 1kg)
    // Documentado: si no viene totalWeightGrams, usamos 1kg como default
    const weightGrams = totalWeightGrams || 1000;

    const rates = await getSkydropxRates(
      {
        postalCode: address.postalCode,
        state: address.state,
        city: address.city || "",
        country: address.country || "MX",
      },
      {
        weightGrams,
        // Dimensiones por defecto: 20x20x10 cm (ya manejadas en getSkydropxRates)
      },
    );

    if (process.env.NODE_ENV !== "production") {
      console.log("[shipping/rates] Tarifas obtenidas de getSkydropxRates:", rates.length);
    }

    // Si hay tarifas, devolver ok: true
    if (rates.length > 0) {
      // Verificar si aplica envío gratis (subtotal >= $2,000 MXN)
      const appliesFreeShipping = subtotalCents !== undefined && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
      
      // Mapear tarifas a formato UI
      const options: UiShippingOption[] = rates
        .map((rate, index) => {
          // Generar código único basado en provider y service
          const code = `skydropx_${rate.provider}_${index}`;
          
          // Generar label descriptivo
          const etaText =
            rate.etaMinDays && rate.etaMaxDays
              ? ` (${rate.etaMinDays}-${rate.etaMaxDays} días)`
              : rate.etaMinDays
                ? ` (${rate.etaMinDays}+ días)`
                : "";
          const label = `${rate.service}${etaText}`;

          // Aplicar promo de envío gratis si aplica
          const finalPriceCents = appliesFreeShipping ? 0 : rate.totalPriceCents;

          return {
            code,
            label,
            priceCents: finalPriceCents,
            provider: "skydropx" as const,
            etaMinDays: rate.etaMinDays,
            etaMaxDays: rate.etaMaxDays,
            externalRateId: rate.externalRateId,
            originalPriceCents: appliesFreeShipping ? rate.totalPriceCents : undefined,
          };
        });
      // Ya viene ordenado de getSkydropxRates, pero por seguridad ordenamos de nuevo
      options.sort((a, b) => a.priceCents - b.priceCents);

      if (process.env.NODE_ENV !== "production") {
        console.log("[shipping/rates] Opciones de envío generadas:", options.length);
      }

      return NextResponse.json({ ok: true, options });
    }

    // Si no hay tarifas, devolver respuesta con ok: false pero status 200
    if (process.env.NODE_ENV !== "production") {
      console.warn("[shipping/rates] No se obtuvieron tarifas de Skydropx");
    }
    return NextResponse.json({
      ok: false,
      reason: "no_rates_from_skydropx",
      options: [],
    });

  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[shipping/rates] Error inesperado:", error);
    }
    
    // Determinar el motivo del error
    let reason = "skydropx_error";
    if (error instanceof Error) {
      if (error.message === "skydropx_auth_error") {
        reason = "skydropx_auth_error";
      } else if (error.message === "skydropx_fetch_error") {
        reason = "skydropx_fetch_error";
      }
    }
    
    // No devolver 500, devolver 200 con ok: false para que el frontend maneje
    return NextResponse.json({
      ok: false,
      reason,
      options: [],
    });
  }
}

