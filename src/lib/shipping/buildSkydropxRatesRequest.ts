/**
 * Builder unificado para requests de cotización de Skydropx
 * Garantiza paridad entre checkout y admin requote
 */

import { getSkydropxConfig } from "./skydropx.server";
import { normalizeMxAddress } from "./normalizeAddress";
import type { SkydropxQuotationPayload } from "@/lib/skydropx/client";

/**
 * Peso mínimo billable para Skydropx (1kg)
 * Skydropx requiere/cobra mínimo 1kg para cotizaciones y envíos
 * Configurable vía env var: SKYDROPX_MIN_BILLABLE_WEIGHT_G (default: 1000)
 */
const MIN_BILLABLE_WEIGHT_G = parseInt(
  process.env.SKYDROPX_MIN_BILLABLE_WEIGHT_G || "1000",
  10,
);

export type SkydropxRatesRequestInput = {
  origin?: {
    postalCode?: string;
    state?: string;
    city?: string;
    country?: string;
    address1?: string; // Para origin desde env vars
    address2?: string; // Para origin street2/reference
  };
  destination: {
    postalCode: string;
    state: string;
    city: string;
    country?: string;
    address1?: string; // REQUERIDO: calle/dirección de destino
    address2?: string; // Opcional: segunda línea o referencia
  };
  package: {
    weightGrams: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
  };
  declaredValue?: number;
  orderId?: string;
};

export type SkydropxRatesRequestDiagnostic = {
  origin: {
    postal_code_present: boolean;
    city: string;
    state: string;
    country_code: string;
    street1_len: number;
    area_level3_len: number; // Longitud de colonia/barrio usado para area_level3
    area_level3_source: "config" | "alcaldia" | "address2" | "address1" | "none"; // Source del area_level3
  };
  destination: {
    postal_code_present: boolean;
    city: string;
    state: string;
    country_code: string;
    street1_len: number;
    area_level3_len: number; // Longitud de colonia/barrio usado para area_level3
    area_level3_source: "address2" | "address1" | "none"; // Source del area_level3
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
  quotation?: {
    quotation_id?: string | null;
    is_completed?: boolean;
    polling_attempts?: number;
    polling_elapsed_ms?: number;
    host_used?: string | null;
    rates_count_raw?: number;
    rates_count_filtered?: number;
  };
};

/**
 * Construye un payload de cotización de Skydropx de forma unificada
 * 
 * @param input Datos de origen, destino y paquete
 * @returns Payload listo para enviar a Skydropx y diagnóstico
 */
export function buildSkydropxRatesRequest(
  input: SkydropxRatesRequestInput,
): {
  payload: SkydropxQuotationPayload;
  diagnostic: SkydropxRatesRequestDiagnostic;
} {
  // Obtener configuración de origen (desde env vars)
  const config = getSkydropxConfig();
  if (!config) {
    throw new Error("Configuración de Skydropx incompleta");
  }

  // ORIGEN: Usar config por defecto, o input.origin si se proporciona
  // Normalizar origin igual que destination (especialmente CDMX)
  const originPostalCode = input.origin?.postalCode || config.origin.postalCode;
  const originStateRaw = input.origin?.state || config.origin.state;
  const originCityRaw = input.origin?.city || config.origin.city;
  const originCountry = input.origin?.country || config.origin.country || "MX";
  const originAddress1 = (input.origin?.address1 || config.origin.addressLine1 || "").trim();
  const originAddress2 = input.origin?.address2 ? input.origin.address2.trim() : undefined;
  
  // Normalizar origin (especialmente CDMX con acentos/alcaldías)
  const normalizedOrigin = normalizeMxAddress({
    state: originStateRaw,
    city: originCityRaw || "",
    postalCode: originPostalCode,
  });
  
  // ORIGEN: Construir area_level3 (colonia/barrio) para Skydropx
  // PRIORIDAD: env var SKYDROPX_ORIGIN_AREA_LEVEL3 > alcaldía > address2 > address1 (último recurso)
  const originAlcaldia = normalizedOrigin.wasAlcaldia;
  const originAreaLevel3FromEnv = config.origin.areaLevel3;
  const originNeighborhood = originAreaLevel3FromEnv
    ? originAreaLevel3FromEnv.substring(0, 45) // Prioridad 1: env var configurada
    : originAlcaldia
      ? originAlcaldia.substring(0, 45) // Prioridad 2: alcaldía detectada
      : originAddress2
        ? originAddress2.substring(0, 45) // Prioridad 3: address2 (colonia)
        : originAddress1
          ? originAddress1.split(",")[0].substring(0, 45) // Prioridad 4: address1 (último recurso)
          : undefined;
  
  // Determinar source de origin area_level3 para diagnóstico
  const originAreaLevel3Source = originAreaLevel3FromEnv
    ? "config"
    : originAlcaldia
      ? "alcaldia"
      : originAddress2
        ? "address2"
        : originAddress1
          ? "address1"
          : "none";

  // DESTINO: Normalizar dirección (especialmente CDMX)
  const normalizedDest = normalizeMxAddress({
    state: input.destination.state,
    city: input.destination.city || "",
    postalCode: input.destination.postalCode,
  });

  const destCountry = input.destination.country || "MX";
  // DESTINO address1: REQUERIDO (si falta, debería fallar antes de llegar aquí)
  const destAddress1 = (input.destination.address1 || "").trim();
  const destAddress2 = input.destination.address2 ? input.destination.address2.trim() : undefined;
  
  // DESTINO: Construir area_level3 (colonia/barrio) para Skydropx
  // PRIORIDAD: address2 (colonia) > neighborhood > address1 (último recurso)
  // En metadata.shipping_address.address2 suele venir la colonia (ej: "NARCISO MENDOZA")
  const destNeighborhood = destAddress2
    ? destAddress2.substring(0, 45) // Prioridad 1: address2 (colonia)
    : destAddress1
      ? destAddress1.split(",")[0].substring(0, 45) // Prioridad 2: address1 (último recurso)
      : undefined;
  
  // Determinar source de destination area_level3 para diagnóstico
  const destAreaLevel3Source = destAddress2
    ? "address2"
    : destAddress1
      ? "address1"
      : "none";

  // PAQUETE: Valores por defecto si no se proporcionan, con hardening (valores mínimos razonables)
  const rawWeightGrams = input.package.weightGrams || 1000;
  const rawLengthCm = input.package.lengthCm || 20;
  const rawWidthCm = input.package.widthCm || 20;
  const rawHeightCm = input.package.heightCm || 10;

  // Hardening: valores mínimos razonables para evitar payloads inválidos
  // Skydropx requiere/cobra mínimo 1kg (1000g) para cotizaciones y envíos
  const weightGrams = Math.max(rawWeightGrams, MIN_BILLABLE_WEIGHT_G);
  const wasWeightClamped = rawWeightGrams < MIN_BILLABLE_WEIGHT_G;
  const weightKg = weightGrams / 1000;
  const lengthCm = Math.max(rawLengthCm, 1); // Mínimo 1cm
  const widthCm = Math.max(rawWidthCm, 1); // Mínimo 1cm
  const heightCm = Math.max(rawHeightCm, 1); // Mínimo 1cm

  // Construir payload según estructura esperada por Skydropx
  const payload: SkydropxQuotationPayload = {
    address_from: {
      state: normalizedOrigin.state, // Usar state normalizado
      province: normalizedOrigin.state, // Alias para compatibilidad
      city: normalizedOrigin.city, // Usar city normalizado (ej: "Ciudad de Mexico" sin acento)
      country: originCountry,
      zip: normalizedOrigin.postalCode,
      // neighborhood = area_level3 (colonia/barrio) para Skydropx quotations
      // Prioridad: env var > alcaldía > address2 > address1
      neighborhood: originNeighborhood,
      name: config.origin.name,
      phone: config.origin.phone || null,
      email: config.origin.email || null,
      address1: originAddress1 ? originAddress1.substring(0, 45) || null : null, // Máximo 45 chars (calle)
      // address2 como referencia adicional (NO para area_level3 en quotations)
      address2: originAddress2 ? originAddress2.substring(0, 45) : undefined,
    },
    address_to: {
      state: normalizedDest.state,
      province: normalizedDest.state, // Alias para compatibilidad
      city: normalizedDest.city,
      country: destCountry,
      zip: normalizedDest.postalCode,
      // neighborhood = area_level3 (colonia/barrio) para Skydropx quotations
      // Prioridad: address2 (colonia) > address1 (último recurso)
      neighborhood: destNeighborhood,
      // address1 = calle (NO usar como area_level3)
      address1: destAddress1 ? destAddress1.substring(0, 45) : null,
      // address2 = colonia (usada como neighborhood/area_level3)
      address2: destAddress2 ? destAddress2.substring(0, 45) : undefined,
    },
    parcels: [
      {
        weight: weightKg, // En kilogramos
        distance_unit: "CM",
        mass_unit: "KG",
        height: heightCm,
        width: widthCm,
        length: lengthCm,
      },
    ],
    declaredValue: input.declaredValue || 100,
    order_id: input.orderId || "ddn-web-checkout",
  };

  // Construir diagnóstico (sin PII)
  const diagnostic: SkydropxRatesRequestDiagnostic = {
    origin: {
      postal_code_present: !!normalizedOrigin.postalCode && normalizedOrigin.postalCode.length > 0,
      city: normalizedOrigin.city || "[missing]", // Reflejar city normalizado (ej: "Ciudad de Mexico")
      state: normalizedOrigin.state || "[missing]", // Reflejar state normalizado
      country_code: originCountry,
      street1_len: originAddress1 ? originAddress1.substring(0, 45).length : 0, // Reflejar address1 real (post-fallback)
      area_level3_len: originNeighborhood ? originNeighborhood.length : 0, // Longitud de colonia/barrio usado para area_level3
      area_level3_source: originAreaLevel3Source, // Source del area_level3
    },
    destination: {
      postal_code_present: !!normalizedDest.postalCode && normalizedDest.postalCode.length > 0,
      city: normalizedDest.city || "[missing]",
      state: normalizedDest.state || "[missing]",
      country_code: destCountry,
      street1_len: destAddress1 ? destAddress1.substring(0, 45).length : 0, // Reflejar address1 real (post-fallback)
      area_level3_len: destNeighborhood ? destNeighborhood.length : 0, // Longitud de colonia/barrio usado para area_level3
      area_level3_source: destAreaLevel3Source, // Source del area_level3
    },
    pkg: {
      length_cm: lengthCm,
      width_cm: widthCm,
      height_cm: heightCm,
      weight_g: weightGrams, // Peso final usado (después de clamp)
      was_clamped: wasWeightClamped, // Si el peso fue ajustado al mínimo
      min_billable_weight_g: MIN_BILLABLE_WEIGHT_G, // Mínimo billable usado (para diagnóstico)
    },
    usedSources: {
      origin: input.origin ? "provided" : "config",
      destination: "normalized", // Siempre normalizado
      package: input.package.lengthCm !== undefined ? "provided" : "default",
    },
  };

  return { payload, diagnostic };
}
