/**
 * Normalización y dedupe de tarifas de envío de Skydropx
 * Incluye formateo de ETA, traducciones y selección de mejores opciones
 */

import type { UiShippingOption } from "@/app/api/shipping/rates/route";

export type NormalizedShippingOption = UiShippingOption & {
  etaFormatted: string; // "2 días", "3-5 días", etc.
  etaBucket: "0-1" | "2-3" | "4-7" | "8+"; // Para agrupar por velocidad
  serviceTranslated: string; // Nombre traducido del servicio
  dedupeKey: string; // Llave única para dedupe
};

/**
 * Traduce nombres comunes de servicios de envío
 */
function translateServiceName(service: string): string {
  const translations: Record<string, string> = {
    Standard: "Estándar",
    standard: "Estándar",
    Express: "Exprés",
    express: "Exprés",
    "Next Day": "Siguiente día",
    "next day": "Siguiente día",
    "Next-Day": "Siguiente día",
    "next-day": "Siguiente día",
    Economy: "Económico",
    economy: "Económico",
    Priority: "Prioritario",
    priority: "Prioritario",
  };

  return translations[service] || service;
}

/**
 * Formatea ETA en español con pluralización correcta
 */
function formatETA(etaMin: number | null, etaMax: number | null): string {
  if (etaMin === null && etaMax === null) {
    return "Tiempo estimado";
  }

  if (etaMin === etaMax) {
    // Mismo día: singular/plural
    const days = etaMin!;
    return days === 1 ? "1 día" : `${days} días`;
  }

  if (etaMin !== null && etaMax !== null) {
    // Rango: siempre plural
    return `${etaMin}-${etaMax} días`;
  }

  // Solo uno de los dos
  if (etaMin !== null) {
    return etaMin === 1 ? "1+ día" : `${etaMin}+ días`;
  }

  if (etaMax !== null) {
    return etaMax === 1 ? "Hasta 1 día" : `Hasta ${etaMax} días`;
  }

  return "Tiempo estimado";
}

/**
 * Determina el bucket de ETA para agrupar opciones
 */
function getETABucket(etaMin: number | null, etaMax: number | null): "0-1" | "2-3" | "4-7" | "8+" {
  // Usar etaMax como referencia principal (tiempo máximo)
  const maxDays = etaMax ?? etaMin ?? 999;

  if (maxDays <= 1) return "0-1";
  if (maxDays <= 3) return "2-3";
  if (maxDays <= 7) return "4-7";
  return "8+";
}

/**
 * Genera una llave única para dedupe basada en carrier, service, ETA y precio
 */
function generateDedupeKey(option: UiShippingOption): string {
  const parts = [
    option.provider,
    option.label.split(" ")[0], // Primer parte del label (service)
    option.etaMinDays ?? "null",
    option.etaMaxDays ?? "null",
    option.priceCents.toString(),
  ];
  return parts.join("|");
}

/**
 * Normaliza y dedupe opciones de envío
 */
export function normalizeShippingRates(
  options: UiShippingOption[],
): NormalizedShippingOption[] {
  // 1. Normalizar cada opción
  const normalized = options.map((option) => {
    const serviceName = option.label.split("(")[0].trim(); // Extraer nombre antes de ETA
    const serviceTranslated = translateServiceName(serviceName);

    const etaFormatted = formatETA(option.etaMinDays, option.etaMaxDays);
    const etaBucket = getETABucket(option.etaMinDays, option.etaMaxDays);
    const dedupeKey = generateDedupeKey(option);

    return {
      ...option,
      etaFormatted,
      etaBucket,
      serviceTranslated,
      dedupeKey,
    };
  });

  // 2. Dedupe por llave única
  const seen = new Map<string, NormalizedShippingOption>();
  for (const option of normalized) {
    const existing = seen.get(option.dedupeKey);
    if (!existing || option.priceCents < existing.priceCents) {
      // Si hay duplicado, mantener el más barato
      seen.set(option.dedupeKey, option);
    }
  }

  const deduped = Array.from(seen.values());

  // 3. Ordenar por precio ascendente
  deduped.sort((a, b) => a.priceCents - b.priceCents);

  return deduped;
}

/**
 * Selecciona las mejores opciones: recommended, cheapest, fastest
 */
export function selectTopShippingOptions(
  normalized: NormalizedShippingOption[],
): {
  recommended: NormalizedShippingOption | null;
  cheapest: NormalizedShippingOption | null;
  fastest: NormalizedShippingOption | null;
} {
  if (normalized.length === 0) {
    return {
      recommended: null,
      cheapest: null,
      fastest: null,
    };
  }

  // Cheapest: primera opción (ya está ordenada por precio)
  const cheapest = normalized[0];

  // Recommended: cheapest dentro de ETA <= 3 días, si no cheapest overall
  const fastOptions = normalized.filter(
    (opt) => opt.etaMaxDays !== null && opt.etaMaxDays <= 3,
  );
  const recommended = fastOptions.length > 0 ? fastOptions[0] : cheapest;

  // Fastest: menor etaMax, si empate menor precio
  const fastest = normalized.reduce((best, current) => {
    if (best === null) return current;

    const bestMax = best.etaMaxDays ?? 999;
    const currentMax = current.etaMaxDays ?? 999;

    if (currentMax < bestMax) return current;
    if (currentMax === bestMax && current.priceCents < best.priceCents) {
      return current;
    }
    return best;
  }, null as NormalizedShippingOption | null);

  return {
    recommended: recommended || cheapest,
    cheapest,
    fastest: fastest || cheapest,
  };
}

/**
 * Construye la respuesta con primaryOptions y allOptions
 */
export function buildShippingOptionsResponse(
  normalized: NormalizedShippingOption[],
): {
  primaryOptions: NormalizedShippingOption[];
  allOptions: NormalizedShippingOption[];
} {
  const { recommended, cheapest, fastest } = selectTopShippingOptions(normalized);

  // Construir primaryOptions: [recommended, cheapest (si distinto), fastest (si distinto)]
  const primaryOptions: NormalizedShippingOption[] = [];
  const seenCodes = new Set<string>();

  if (recommended) {
    primaryOptions.push(recommended);
    seenCodes.add(recommended.code);
  }

  if (cheapest && cheapest.code !== recommended?.code && !seenCodes.has(cheapest.code)) {
    primaryOptions.push(cheapest);
    seenCodes.add(cheapest.code);
  }

  if (fastest && fastest.code !== recommended?.code && fastest.code !== cheapest?.code && !seenCodes.has(fastest.code)) {
    primaryOptions.push(fastest);
    seenCodes.add(fastest.code);
  }

  // Limitar a máximo 3
  const finalPrimary = primaryOptions.slice(0, 3);

  return {
    primaryOptions: finalPrimary,
    allOptions: normalized,
  };
}

