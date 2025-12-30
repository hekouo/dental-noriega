import { NextRequest, NextResponse } from "next/server";
import { getSkydropxRates } from "@/lib/shipping/skydropx.server";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping/freeShipping";
import { normalizeMxAddress } from "@/lib/shipping/normalizeAddress";

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

/**
 * Valida que las variables de entorno de Skydropx estén presentes
 * (sin exponer valores sensibles)
 */
function validateSkydropxEnv(): { valid: boolean; missing: string[] } {
  const required = [
    "SKYDROPX_CLIENT_ID",
    "SKYDROPX_CLIENT_SECRET",
    "SKYDROPX_ORIGIN_NAME",
    "SKYDROPX_ORIGIN_STATE",
    "SKYDROPX_ORIGIN_CITY",
    "SKYDROPX_ORIGIN_POSTAL_CODE",
  ];
  
  const missing = required.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "";
  });
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

export async function POST(req: NextRequest) {
  try {
    // Validar env vars de Skydropx (sin exponer secretos)
    const envCheck = validateSkydropxEnv();
    if (!envCheck.valid) {
      console.error("[shipping/rates] Env vars faltantes:", envCheck.missing.join(", "));
      return NextResponse.json(
        {
          ok: false,
          reason: "skydropx_config_error",
          error: "Configuración de envío incompleta. Contacta al soporte.",
          options: [],
        },
        { status: 200 },
      );
    }

    const body = (await req.json().catch(() => null)) as RatesRequest | null;

    if (!body || !body.address) {
      console.error("[shipping/rates] Request inválida: falta address");
      return NextResponse.json(
        { ok: false, reason: "invalid_destination", error: "Se requiere address con postalCode, state y city" },
        { status: 200 }, // 200 para que el frontend maneje el error
      );
    }

    const { address, totalWeightGrams, subtotalCents } = body;

    if (!address.postalCode || !address.state) {
      console.error("[shipping/rates] Request inválida: falta postalCode o state", {
        hasPostalCode: !!address.postalCode,
        hasState: !!address.state,
      });
      return NextResponse.json(
        { ok: false, reason: "invalid_destination", error: "address.postalCode y address.state son requeridos" },
        { status: 200 },
      );
    }

    // Validar formato de CP (5 dígitos)
    if (!/^\d{5}$/.test(address.postalCode)) {
      console.error("[shipping/rates] CP inválido:", address.postalCode);
      return NextResponse.json(
        { ok: false, reason: "invalid_destination", error: "El código postal debe tener 5 dígitos" },
        { status: 200 },
      );
    }

    // Normalizar dirección para Skydropx (especialmente CDMX)
    const normalizedAddress = normalizeMxAddress({
      state: address.state,
      city: address.city || "",
      postalCode: address.postalCode,
    });

    // Log estructurado para producción (sin datos sensibles)
    // Mostrar valores normalizados para verificar en Vercel Logs
    console.log("[shipping/rates] Request recibida:", {
      postalCode: normalizedAddress.postalCode,
      state: normalizedAddress.state,
      city: normalizedAddress.city,
      country: address.country || "MX",
      totalWeightGrams: totalWeightGrams || 1000,
      subtotalCents: subtotalCents || 0,
      originalState: address.state !== normalizedAddress.state ? address.state : undefined,
      originalCity: address.city !== normalizedAddress.city ? address.city : undefined,
    });

    // Usar peso total del carrito o fallback razonable (1000g = 1kg)
    // Documentado: si no viene totalWeightGrams, usamos 1kg como default
    const weightGrams = totalWeightGrams || 1000;

    try {
      const rates = await getSkydropxRates(
        {
          postalCode: normalizedAddress.postalCode,
          state: normalizedAddress.state,
          city: normalizedAddress.city,
          country: address.country || "MX",
        },
        {
          weightGrams,
          // Dimensiones por defecto: 20x20x10 cm (ya manejadas en getSkydropxRates)
        },
      );

      console.log("[shipping/rates] Tarifas obtenidas:", {
        count: rates.length,
        postalCode: normalizedAddress.postalCode,
        state: normalizedAddress.state,
        city: normalizedAddress.city,
      });

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
      console.warn("[shipping/rates] No se obtuvieron tarifas de Skydropx", {
        postalCode: normalizedAddress.postalCode,
        state: normalizedAddress.state,
        city: normalizedAddress.city,
        originalState: address.state !== normalizedAddress.state ? address.state : undefined,
        originalCity: address.city !== normalizedAddress.city ? address.city : undefined,
      });
      return NextResponse.json({
        ok: false,
        reason: "no_rates_from_skydropx",
        options: [],
      });
    } catch (skydropxError) {
      // Error específico de getSkydropxRates
      console.error("[shipping/rates] Error al obtener tarifas de Skydropx:", {
        error: skydropxError instanceof Error ? skydropxError.message : String(skydropxError),
        code: skydropxError instanceof Error && "code" in skydropxError ? skydropxError.code : undefined,
        postalCode: normalizedAddress.postalCode,
        state: normalizedAddress.state,
        city: normalizedAddress.city,
        originalState: address.state !== normalizedAddress.state ? address.state : undefined,
        originalCity: address.city !== normalizedAddress.city ? address.city : undefined,
      });
      
      // Determinar el motivo del error
      let reason = "skydropx_error";
      if (skydropxError instanceof Error) {
        if (skydropxError.message.includes("auth") || skydropxError.message.includes("credenciales")) {
          reason = "skydropx_auth_error";
        } else if (skydropxError.message.includes("fetch") || skydropxError.message.includes("network")) {
          reason = "skydropx_fetch_error";
        }
      }
      
      return NextResponse.json({
        ok: false,
        reason,
        error: "Error al calcular tarifas de envío. Intenta de nuevo.",
        options: [],
      });
    }

  } catch (error) {
    // Error general (parsing, etc.)
    console.error("[shipping/rates] Error inesperado:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Determinar el motivo del error
    let reason = "skydropx_error";
    if (error instanceof Error) {
      if (error.message === "skydropx_auth_error" || error.message.includes("auth")) {
        reason = "skydropx_auth_error";
      } else if (error.message === "skydropx_fetch_error" || error.message.includes("fetch")) {
        reason = "skydropx_fetch_error";
      }
    }
    
    // No devolver 500, devolver 200 con ok: false para que el frontend maneje
    return NextResponse.json({
      ok: false,
      reason,
      error: "Error inesperado al calcular tarifas. Intenta de nuevo.",
      options: [],
    });
  }
}

