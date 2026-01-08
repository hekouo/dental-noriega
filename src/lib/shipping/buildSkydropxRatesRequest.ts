/**
 * Builder unificado para requests de cotización de Skydropx
 * Garantiza paridad entre checkout y admin requote
 */

import { getSkydropxConfig } from "./skydropx.server";
import { normalizeMxAddress } from "./normalizeAddress";
import type { SkydropxQuotationPayload } from "@/lib/skydropx/client";

export type SkydropxRatesRequestInput = {
  origin?: {
    postalCode?: string;
    state?: string;
    city?: string;
    country?: string;
  };
  destination: {
    postalCode: string;
    state: string;
    city: string;
    country?: string;
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
  const originPostalCode = input.origin?.postalCode || config.origin.postalCode;
  const originState = input.origin?.state || config.origin.state;
  const originCity = input.origin?.city || config.origin.city;
  const originCountry = input.origin?.country || config.origin.country || "MX";

  // DESTINO: Normalizar dirección (especialmente CDMX)
  const normalizedDest = normalizeMxAddress({
    state: input.destination.state,
    city: input.destination.city || "",
    postalCode: input.destination.postalCode,
  });

  const destCountry = input.destination.country || "MX";

  // PAQUETE: Valores por defecto si no se proporcionan, con hardening (valores mínimos razonables)
  const rawWeightGrams = input.package.weightGrams || 1000;
  const rawLengthCm = input.package.lengthCm || 20;
  const rawWidthCm = input.package.widthCm || 20;
  const rawHeightCm = input.package.heightCm || 10;

  // Hardening: valores mínimos razonables para evitar payloads inválidos
  const weightGrams = Math.max(rawWeightGrams, 50); // Mínimo 50g
  const weightKg = weightGrams / 1000;
  const lengthCm = Math.max(rawLengthCm, 1); // Mínimo 1cm
  const widthCm = Math.max(rawWidthCm, 1); // Mínimo 1cm
  const heightCm = Math.max(rawHeightCm, 1); // Mínimo 1cm

  // Construir payload según estructura esperada por Skydropx
  const payload: SkydropxQuotationPayload = {
    address_from: {
      state: originState,
      province: originState, // Alias para compatibilidad
      city: originCity,
      country: originCountry,
      zip: originPostalCode,
      neighborhood: config.origin.addressLine1
        ? config.origin.addressLine1.split(",")[0]
        : undefined,
      name: config.origin.name,
      phone: config.origin.phone || null,
      email: config.origin.email || null,
      address1: (config.origin.addressLine1 || "").substring(0, 45) || null, // Máximo 45 chars
    },
    address_to: {
      state: normalizedDest.state,
      province: normalizedDest.state, // Alias para compatibilidad
      city: normalizedDest.city,
      country: destCountry,
      zip: normalizedDest.postalCode,
      // neighborhood no está disponible en destination, se usará city como fallback
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
      postal_code_present: !!originPostalCode && originPostalCode.length > 0,
      city: originCity || "[missing]",
      state: originState || "[missing]",
      country_code: originCountry,
      street1_len: (config.origin.addressLine1 || "").substring(0, 45).length,
    },
    destination: {
      postal_code_present: !!normalizedDest.postalCode && normalizedDest.postalCode.length > 0,
      city: normalizedDest.city || "[missing]",
      state: normalizedDest.state || "[missing]",
      country_code: destCountry,
      street1_len: 0, // No disponible en destination para cotizaciones
    },
    pkg: {
      length_cm: lengthCm,
      width_cm: widthCm,
      height_cm: heightCm,
      weight_g: weightGrams,
    },
    usedSources: {
      origin: input.origin ? "provided" : "config",
      destination: "normalized", // Siempre normalizado
      package: input.package.lengthCm !== undefined ? "provided" : "default",
    },
  };

  return { payload, diagnostic };
}
