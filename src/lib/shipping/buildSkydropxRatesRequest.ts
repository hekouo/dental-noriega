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
  const originAddress1 = (input.origin?.address1 || config.origin.addressLine1 || "").trim();
  const originAddress2 = input.origin?.address2 ? input.origin.address2.trim() : undefined;

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
      // Usar address1 en neighborhood (para area_level3 en Skydropx)
      neighborhood: originAddress1
        ? originAddress1.split(",")[0].substring(0, 45)
        : undefined,
      name: config.origin.name,
      phone: config.origin.phone || null,
      email: config.origin.email || null,
      address1: originAddress1 ? originAddress1.substring(0, 45) || null : null, // Máximo 45 chars
      // address2 como referencia si existe
      address2: originAddress2 ? originAddress2.substring(0, 45) : undefined,
    },
    address_to: {
      state: normalizedDest.state,
      province: normalizedDest.state, // Alias para compatibilidad
      city: normalizedDest.city,
      country: destCountry,
      zip: normalizedDest.postalCode,
      // Usar address1 en neighborhood (para area_level3 en Skydropx)
      neighborhood: destAddress1 ? destAddress1.substring(0, 45) : undefined,
      // También incluir address1 directamente (para compatibilidad)
      address1: destAddress1 ? destAddress1.substring(0, 45) : null,
      // address2 como referencia si existe
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
      postal_code_present: !!originPostalCode && originPostalCode.length > 0,
      city: originCity || "[missing]",
      state: originState || "[missing]",
      country_code: originCountry,
      street1_len: originAddress1 ? originAddress1.substring(0, 45).length : 0, // Reflejar address1 real (post-fallback)
    },
    destination: {
      postal_code_present: !!normalizedDest.postalCode && normalizedDest.postalCode.length > 0,
      city: normalizedDest.city || "[missing]",
      state: normalizedDest.state || "[missing]",
      country_code: destCountry,
      street1_len: destAddress1 ? destAddress1.substring(0, 45).length : 0, // Reflejar address1 real (post-fallback)
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
