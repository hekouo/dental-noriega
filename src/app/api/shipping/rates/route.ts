import { NextRequest, NextResponse } from "next/server";
import { getSkydropxRates, type SkydropxRate } from "@/lib/shipping/skydropx.server";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping/freeShipping";
import { normalizeMxAddress, type NormalizedAddress } from "@/lib/shipping/normalizeAddress";
import {
  normalizeShippingRates,
  buildShippingOptionsResponse,
  type NormalizedShippingOption,
} from "@/lib/shipping/normalizeRates";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Cache in-memory para tarifas de envío
 * TTL: 60 segundos
 */
type CacheEntry = {
  response: ShippingRatesResponse;
  expiresAt: number;
};

const ratesCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

/**
 * Genera una key única para el cache basada en los parámetros de la request
 */
function generateCacheKey(
  postalCode: string,
  state: string,
  city: string,
  country: string,
  totalWeightGrams: number,
  subtotalCents: number,
): string {
  return `${postalCode}|${state}|${city}|${country}|${totalWeightGrams}|${subtotalCents}`;
}

/**
 * Genera un hash simple de la key para logging (sin exponer datos sensibles)
 */
function hashCacheKey(key: string): string {
  // Hash simple usando el código postal y los últimos caracteres
  const parts = key.split("|");
  const postalCode = parts[0] || "";
  const lastChars = key.slice(-8);
  return `${postalCode}_${lastChars.slice(-4)}`;
}

/**
 * Limpia entradas expiradas del cache
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of ratesCache.entries()) {
    if (entry.expiresAt < now) {
      ratesCache.delete(key);
    }
  }
}

export type UiShippingOption = {
  code: string; // p.ej. "skydropx_standard"
  label: string; // p.ej. "Envío a domicilio (2-4 días)"
  priceCents: number;
  provider: "skydropx";
  etaMinDays: number | null;
  etaMaxDays: number | null;
  externalRateId: string; // el rate id original
  originalPriceCents?: number; // Precio original antes de aplicar promo (para mostrar "antes $XXX")
  carrierCents?: number;
  packagingCents?: number;
  totalCents?: number;
  includesPackagingFee?: boolean;
  packageUsed?: {
    weight_g: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    source: "default" | "calculated";
  };
};

// Tipo extendido para respuesta con normalización
export type ShippingRatesResponse = {
  ok: true;
  options: NormalizedShippingOption[]; // primaryOptions (compatibilidad)
  primaryOptions: NormalizedShippingOption[]; // Top 3 opciones
  allOptions: NormalizedShippingOption[]; // Todas las opciones normalizadas
  includes_packaging_fee?: boolean;
  package_used?: {
    weight_g: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
    source: "default" | "calculated";
  };
} | {
  ok: false;
  reason: string;
  error?: string;
  options: [];
  primaryOptions?: [];
  allOptions?: [];
};

type RatesRequest = {
  address: {
    postalCode: string;
    state: string;
    city: string;
    country?: string;
    neighborhood?: string;
    colonia?: string;
    address2?: string;
  };
  totalWeightGrams?: number;
  subtotalCents?: number; // Subtotal del carrito en centavos para aplicar promo de envío gratis
};

/**
 * Aplica margen configurable (handling fee + markup) a precio en centavos
 * Redondea a múltiplo de 100 (1 peso) para que se vea profesional
 */
function applyShippingMargin(priceCents: number): number {
  // Handling fee (fijo en centavos)
  const handlingFeeCents = parseInt(process.env.SHIPPING_HANDLING_FEE_CENTS || "0", 10) || 0;
  
  // Markup (porcentaje, ej: 10 = 10%)
  const markupPercent = parseFloat(process.env.SHIPPING_MARKUP_PERCENT || "0") || 0;
  
  // Aplicar markup primero
  let finalPrice = priceCents;
  if (markupPercent > 0) {
    finalPrice = Math.round(priceCents * (1 + markupPercent / 100));
  }
  
  // Aplicar handling fee
  finalPrice += handlingFeeCents;
  
  // Redondear a múltiplo de 100 (1 peso)
  finalPrice = Math.round(finalPrice / 100) * 100;
  
  // Asegurar mínimo 0
  return Math.max(0, finalPrice);
}

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

    // Validar payload: subtotalCents y totalWeightGrams deben ser > 0
    if (!totalWeightGrams || totalWeightGrams <= 0 || !subtotalCents || subtotalCents <= 0) {
      console.warn("[shipping/rates] Payload inválido:", {
        totalWeightGrams: totalWeightGrams || 0,
        subtotalCents: subtotalCents || 0,
        postalCode: normalizedAddress.postalCode,
      });
      return NextResponse.json({
        ok: false,
        reason: "invalid_payload",
        error: "El carrito debe tener productos para calcular tarifas de envío.",
        options: [],
      });
    }

    const BASE_PACKAGING_WEIGHT_G = 1200;
    const BOX_LENGTH_CM = 25;
    const BOX_WIDTH_CM = 20;
    const BOX_HEIGHT_CM = 15;
    const productWeightGrams = totalWeightGrams;
    const weightGrams = Math.max(BASE_PACKAGING_WEIGHT_G + productWeightGrams, BASE_PACKAGING_WEIGHT_G);
    const country = address.country || "MX";
    const finalSubtotalCents = subtotalCents; // Ya validado arriba, no necesita || 0
    const originalCity = address.city?.trim() || "";
    const neighborhood =
      address.neighborhood?.trim() ||
      address.colonia?.trim() ||
      address.address2?.trim() ||
      "";
    const isGenericCDMXCity =
      !originalCity ||
      /^(ciudad de m[eé]xico|cdmx|df|distrito federal)$/i.test(originalCity);

    // Generar key de cache (usando dirección normalizada y valores validados)
    const cacheKey = generateCacheKey(
      normalizedAddress.postalCode,
      normalizedAddress.state,
      normalizedAddress.city,
      country,
      weightGrams,
      finalSubtotalCents,
    );
    const keyHash = hashCacheKey(cacheKey);

    // Limpiar cache expirado periódicamente
    cleanExpiredCache();

    // Verificar cache ANTES de llamar a Skydropx (solo si payload es válido)
    const cachedEntry = ratesCache.get(cacheKey);
    if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
      console.log("[shipping/rates] Cache hit:", {
        cache_hit: true,
        postalCode: normalizedAddress.postalCode,
        state: normalizedAddress.state,
        city: normalizedAddress.city,
        country,
        totalWeightGrams: weightGrams,
        subtotalCents: finalSubtotalCents,
        parcels_count: 1,
        weight_kg: (weightGrams / 1000).toFixed(2),
        dims: "20x20x10 cm",
        cache_key_hash: keyHash,
        attempt: "cache",
      });
      return NextResponse.json(cachedEntry.response);
    }

    // Detectar si es CDMX para aplicar fallback chain
    const isCDMX =
      normalizedAddress.state === "Ciudad de Mexico" ||
      normalizedAddress.state.toLowerCase().includes("ciudad de mexico") ||
      normalizedAddress.state.toLowerCase().includes("distrito federal");

    if (isCDMX && isGenericCDMXCity) {
      console.warn("[shipping/rates] missing_municipality (CDMX):", {
        postalCode: normalizedAddress.postalCode,
        state: normalizedAddress.state,
        city: originalCity || "[empty]",
        area_level1_present: true,
        area_level2_present: false,
        area_level3_present: Boolean(neighborhood),
      });
      return NextResponse.json({
        ok: false,
        reason: "missing_municipality",
        error: "Selecciona tu alcaldía (ej. Tlalpan, Coyoacán).",
        options: [],
      });
    }

    /**
     * Fallback chain para CDMX: prueba diferentes variaciones de state/city
     */
    type FallbackAttempt = {
      attempt: "A" | "B" | "C";
      state: string;
      city: string;
    };

    const getFallbackAttempts = (baseAddress: NormalizedAddress): FallbackAttempt[] => {
      if (!isCDMX) {
        // Para no-CDMX, solo un intento con la dirección normalizada
        return [{
          attempt: "A",
          state: baseAddress.state,
          city: baseAddress.city,
        }];
      }

      // Para CDMX, 3 intentos:
      return [
        {
          attempt: "A",
          state: "Ciudad de Mexico",
          city: "Ciudad de Mexico",
        },
        {
          attempt: "B",
          state: "Ciudad de México",
          city: "Ciudad de México",
        },
        {
          attempt: "C",
          state: "Distrito Federal",
          city: "Ciudad de Mexico",
        },
      ];
    };

    /**
     * Helper para loggear payload shape completo (sanitizado, sin PII)
     */
    const logPayloadShape = (attempt: string, dest: { state: string; city: string; postalCode: string }) => {
      const areaLevel2 = normalizedAddress.wasAlcaldia || originalCity || dest.city;
      const areaLevel3 = neighborhood;
      const originPostalCode = process.env.SKYDROPX_ORIGIN_POSTAL_CODE || "[hidden]";
      console.log("[shipping/rates] Payload shape:", {
        attempt,
        postalCode: dest.postalCode,
        state: dest.state,
        city: dest.city,
        country,
        area_level1_present: Boolean(dest.state),
        area_level2_present: Boolean(areaLevel2),
        area_level3_present: Boolean(areaLevel3),
        missing_municipality: isCDMX && isGenericCDMXCity,
        missing_neighborhood: !areaLevel3,
        totalWeightGrams: weightGrams,
        subtotalCents: finalSubtotalCents,
        parcels_count: 1,
        weight_kg: (weightGrams / 1000).toFixed(2),
        dims: `${BOX_LENGTH_CM}x${BOX_WIDTH_CM}x${BOX_HEIGHT_CM} cm`,
        origin_postal_code: originPostalCode,
        cache_hit: false, // Will be set to true if cache hit
        cache_key_hash: keyHash,
      });
    };

    /**
     * Helper para retry con backoff cuando Skydropx devuelve 0 rates
     */
    const fetchRatesWithRetry = async (
      dest: { postalCode: string; state: string; city: string; country: string },
      attempt: string,
      retryCount = 0,
    ): Promise<SkydropxRate[]> => {
      const ratesResult = await getSkydropxRates(
          {
            postalCode: dest.postalCode,
            state: dest.state,
            city: dest.city,
            country: dest.country,
            areaLevel2: normalizedAddress.wasAlcaldia || originalCity || dest.city,
            neighborhood: neighborhood || undefined,
          },
          {
            weightGrams,
          lengthCm: BOX_LENGTH_CM,
          widthCm: BOX_WIDTH_CM,
          heightCm: BOX_HEIGHT_CM,
          },
        );

        // Extraer rates (puede ser array directo o objeto con rates)
        const rates = Array.isArray(ratesResult) ? ratesResult : ratesResult.rates;

        // Si hay rates, devolverlas
        if (rates.length > 0) {
          return rates;
        }

      // Si no hay rates y es el primer intento, hacer retry con backoff
      if (retryCount === 0) {
        const backoffMs = 250 + Math.random() * 250; // 250-500ms
        console.log(`[shipping/rates] Attempt ${attempt}: 0 rates, retrying after ${backoffMs.toFixed(0)}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        return fetchRatesWithRetry(dest, attempt, 1);
      }

      // Si ya se hizo retry y sigue sin rates, devolver vacío
      return [];
    };

    // Log inicial de request (completo y sanitizado)
    console.log("[shipping/rates] Request recibida:", {
      postalCode: normalizedAddress.postalCode,
      state: normalizedAddress.state,
      city: normalizedAddress.city,
      country,
      totalWeightGrams: weightGrams,
      subtotalCents: finalSubtotalCents,
      parcels_count: 1,
      weight_kg: (weightGrams / 1000).toFixed(2),
      dims: "20x20x10 cm",
      originalState: address.state !== normalizedAddress.state ? address.state : undefined,
      originalCity: address.city !== normalizedAddress.city ? address.city : undefined,
      isCDMX,
      cache_hit: false, // Will be updated if cache hit
      cache_key_hash: keyHash,
    });

    // Obtener intentos de fallback
    const fallbackAttempts = getFallbackAttempts(normalizedAddress);

    let rates: SkydropxRate[] = [];
    let lastError: Error | null = null;

    // CONSISTENCY MODE para CDMX: merge attempts A/B/C si A devuelve <3 opciones
    if (isCDMX && fallbackAttempts.length >= 2) {
      // Intentar A primero
      const attemptA = fallbackAttempts[0];
      try {
        logPayloadShape(attemptA.attempt, {
          state: attemptA.state,
          city: attemptA.city,
          postalCode: normalizedAddress.postalCode,
        });

        const ratesA = await fetchRatesWithRetry(
          {
            postalCode: normalizedAddress.postalCode,
            state: attemptA.state,
            city: attemptA.city,
            country,
          },
          attemptA.attempt,
        );

        if (ratesA.length >= 3) {
          // Si A devuelve 3+ opciones, usar solo esas (suficiente)
          rates = ratesA;
          console.log(`[shipping/rates] CDMX attempt A: ${ratesA.length} rates (suficiente, no merge)`, {
            state: attemptA.state,
            city: attemptA.city,
            postalCode: normalizedAddress.postalCode,
          });
        } else {
          // Si A devuelve <3 opciones o 0, ejecutar B (y opcional C) en paralelo
          console.log(`[shipping/rates] CDMX attempt A: ${ratesA.length} rates, merging with B/C`, {
            state: attemptA.state,
            city: attemptA.city,
            postalCode: normalizedAddress.postalCode,
          });

          const attemptsToMerge = [attemptA, ...fallbackAttempts.slice(1)];
          const mergePromises = attemptsToMerge.map(async (fallback) => {
            try {
              logPayloadShape(fallback.attempt, {
                state: fallback.state,
                city: fallback.city,
                postalCode: normalizedAddress.postalCode,
              });

              const attemptRates = await fetchRatesWithRetry(
                {
                  postalCode: normalizedAddress.postalCode,
                  state: fallback.state,
                  city: fallback.city,
                  country,
                },
                fallback.attempt,
              );

              return { attempt: fallback.attempt, rates: attemptRates, state: fallback.state, city: fallback.city };
            } catch (error) {
              const err = error instanceof Error ? error : new Error(String(error));
              console.error(`[shipping/rates] CDMX merge attempt ${fallback.attempt} error:`, {
                error: err.message,
                state: fallback.state,
                city: fallback.city,
              });
              return { attempt: fallback.attempt, rates: [], state: fallback.state, city: fallback.city };
            }
          });

          const mergeResults = await Promise.all(mergePromises);
          
          // Unir todos los resultados
          const allMergedRates: SkydropxRate[] = [];
          for (const result of mergeResults) {
            allMergedRates.push(...result.rates);
            console.log(`[shipping/rates] CDMX merge attempt ${result.attempt}: ${result.rates.length} rates`, {
              state: result.state,
              city: result.city,
            });
          }

          rates = allMergedRates;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`[shipping/rates] CDMX attempt A error:`, {
          error: lastError.message,
          state: attemptA.state,
          city: attemptA.city,
        });
        // Continuar con merge de B/C incluso si A falla
        const attemptsToMerge = fallbackAttempts.slice(1);
        const mergePromises = attemptsToMerge.map(async (fallback) => {
          try {
            logPayloadShape(fallback.attempt, {
              state: fallback.state,
              city: fallback.city,
              postalCode: normalizedAddress.postalCode,
            });

            const attemptRates = await fetchRatesWithRetry(
              {
                postalCode: normalizedAddress.postalCode,
                state: fallback.state,
                city: fallback.city,
                country,
              },
              fallback.attempt,
            );

            return { attempt: fallback.attempt, rates: attemptRates, state: fallback.state, city: fallback.city };
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error(`[shipping/rates] CDMX merge attempt ${fallback.attempt} error:`, {
              error: err.message,
              state: fallback.state,
              city: fallback.city,
            });
            return { attempt: fallback.attempt, rates: [], state: fallback.state, city: fallback.city };
          }
        });

        const mergeResults = await Promise.all(mergePromises);
        const allMergedRates: SkydropxRate[] = [];
        for (const result of mergeResults) {
          allMergedRates.push(...result.rates);
        }
        rates = allMergedRates;
      }
    } else {
      // Para no-CDMX o CDMX con solo 1 attempt: comportamiento original (secuencial)
      for (const fallback of fallbackAttempts) {
        try {
          logPayloadShape(fallback.attempt, {
            state: fallback.state,
            city: fallback.city,
            postalCode: normalizedAddress.postalCode,
          });

          rates = await fetchRatesWithRetry(
            {
              postalCode: normalizedAddress.postalCode,
              state: fallback.state,
              city: fallback.city,
              country,
            },
            fallback.attempt,
          );

          if (rates.length > 0) {
            console.log(`[shipping/rates] Success on attempt ${fallback.attempt}:`, {
              count: rates.length,
              state: fallback.state,
              city: fallback.city,
              postalCode: normalizedAddress.postalCode,
            });
            break; // Salir del loop si encontramos rates
          }

          console.log(`[shipping/rates] Attempt ${fallback.attempt}: 0 rates`, {
            state: fallback.state,
            city: fallback.city,
          });
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`[shipping/rates] Attempt ${fallback.attempt} error:`, {
            error: lastError.message,
            state: fallback.state,
            city: fallback.city,
          });
          // Continuar con el siguiente intento si hay error técnico
        }
      }
    }

    // Si no se encontraron rates después de todos los intentos
    if (rates.length === 0) {
      console.warn("[shipping/rates] No se obtuvieron tarifas después de todos los intentos:", {
        attempts: fallbackAttempts.map((a) => a.attempt).join(", "),
        postalCode: normalizedAddress.postalCode,
        lastAttempt: fallbackAttempts[fallbackAttempts.length - 1],
        hasError: !!lastError,
        errorMessage: lastError?.message,
      });
    }

    // Si hay tarifas después de fallback/retry, procesarlas
    if (rates.length > 0) {
      // Verificar si aplica envío gratis (subtotal >= $2,000 MXN)
      const appliesFreeShipping = subtotalCents !== undefined && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS;
      
      const PACKAGING_FEE_CENTS = 2000;
      const packageUsed: UiShippingOption["packageUsed"] = {
        weight_g: weightGrams,
        length_cm: BOX_LENGTH_CM,
        width_cm: BOX_WIDTH_CM,
        height_cm: BOX_HEIGHT_CM,
        source: productWeightGrams > 0 ? "calculated" : "default",
      };

      // Mapear tarifas a formato UI
      const options: UiShippingOption[] = rates
        .map((rate, index) => {
          // Generar código único basado en provider y service
          const code = `skydropx_${rate.provider}_${index}`;
          
          // Generar label descriptivo (será reemplazado por normalizeRates)
          const etaText =
            rate.etaMinDays && rate.etaMaxDays
              ? ` (${rate.etaMinDays}-${rate.etaMaxDays} días)`
              : rate.etaMinDays
                ? ` (${rate.etaMinDays}+ días)`
                : "";
          const label = `${rate.service}${etaText}`;

          // Aplicar margen configurable (handling fee + markup)
          const priceWithMargin = applyShippingMargin(rate.totalPriceCents);
          
          const carrierCents = priceWithMargin;
          const totalWithPackaging = carrierCents + PACKAGING_FEE_CENTS;
          // Aplicar promo de envío gratis si aplica (después del margen)
          const finalPriceCents = appliesFreeShipping ? 0 : totalWithPackaging;

          return {
            code,
            label,
            priceCents: finalPriceCents,
            provider: "skydropx" as const,
            etaMinDays: rate.etaMinDays,
            etaMaxDays: rate.etaMaxDays,
            externalRateId: rate.externalRateId,
            originalPriceCents: appliesFreeShipping ? totalWithPackaging : undefined,
            carrierCents,
            packagingCents: PACKAGING_FEE_CENTS,
            totalCents: totalWithPackaging,
            includesPackagingFee: true,
            packageUsed,
          };
        });

      // Normalizar, dedupe y ordenar de forma determinística
      // (normalizeShippingRates ya ordena por priceCents, etaMaxDays, carrier/service)
      const normalized = normalizeShippingRates(options);
      
      // Seleccionar mejores opciones sobre la lista ya ordenada
      const { primaryOptions, allOptions } = buildShippingOptionsResponse(normalized);

      if (process.env.NODE_ENV !== "production") {
        console.log("[shipping/rates] Opciones normalizadas:", {
          total: normalized.length,
          primary: primaryOptions.length,
          all: allOptions.length,
        });
      }

      // Mantener compatibilidad: options = primaryOptions
      const response: ShippingRatesResponse = {
        ok: true,
        options: primaryOptions, // Compatibilidad con frontend existente
        primaryOptions,
        allOptions,
        includes_packaging_fee: true,
        package_used: packageUsed,
      };

      // Guardar en cache DESPUÉS de normalizar/dedupe/ordenar
      ratesCache.set(cacheKey, {
        response,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });

      console.log("[shipping/rates] Cache miss, saved:", {
        cache_hit: false,
        postalCode: normalizedAddress.postalCode,
        state: normalizedAddress.state,
        city: normalizedAddress.city,
        country,
        totalWeightGrams: weightGrams,
        subtotalCents: finalSubtotalCents,
        parcels_count: 1,
        weight_kg: (weightGrams / 1000).toFixed(2),
        dims: `${BOX_LENGTH_CM}x${BOX_WIDTH_CM}x${BOX_HEIGHT_CM} cm`,
        cache_key_hash: keyHash,
        normalized_count: normalized.length,
        primary_count: primaryOptions.length,
        all_count: allOptions.length,
      });

      return NextResponse.json(response);
    }

    // Si no hay tarifas después de todos los intentos, devolver respuesta con ok: false
    const errorResponse: ShippingRatesResponse = {
      ok: false,
      reason: "no_rates_from_skydropx",
      options: [],
    };

    // Cachear también respuestas de error (para evitar repetir fallback chain)
    // Solo cachear si el payload era válido (no cachear invalid_payload)
    ratesCache.set(cacheKey, {
      response: errorResponse,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json(errorResponse);
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

