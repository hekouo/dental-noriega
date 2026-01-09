/**
 * Normaliza direcciones de México para compatibilidad con Skydropx
 * Skydropx es estricto con los formatos de ciudad/estado, especialmente para CDMX
 */

export type AddressInput = {
  state: string;
  city: string;
  postalCode: string;
};

export type NormalizedAddress = {
  state: string;
  city: string;
  postalCode: string;
};

/**
 * Quita acentos de un string (normalización para comparaciones)
 * Ej: "México" → "Mexico", "Álvaro" → "Alvaro"
 */
function removeAccents(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Normaliza un string para comparación (lowercase, sin acentos, trimmed)
 */
function normalizeForComparison(str: string): string {
  return removeAccents(str.trim().toLowerCase());
}

/**
 * Detecta si una dirección es de CDMX (Ciudad de México)
 * Acepta variaciones case-insensitive y con/sin acentos:
 * "Ciudad de México", "Ciudad de Mexico", "cdmx", "CDMX", "DF", "Distrito Federal", etc.
 */
function isCDMX(state: string, city: string): boolean {
  const normalizedState = normalizeForComparison(state);
  const normalizedCity = normalizeForComparison(city);
  
  const cdmxVariations = [
    "ciudad de mexico", // sin acento, normalizado
    "cdmx",
    "df",
    "distrito federal",
    "mexico city",
  ];
  
  return (
    cdmxVariations.includes(normalizedState) ||
    cdmxVariations.includes(normalizedCity)
  );
}

/**
 * Normaliza una dirección de México para Skydropx
 * 
 * Reglas especiales para CDMX:
 * - state: "Ciudad de Mexico" (sin acento)
 * - city: "Ciudad de Mexico" (siempre, no usar "Tlalpan" u otras delegaciones)
 * 
 * Para otras direcciones:
 * - Quita acentos de city/state para consistencia
 * - Mantiene case original pero normalizado
 */
export function normalizeMxAddress(input: AddressInput): NormalizedAddress {
  const { state, city, postalCode } = input;
  
  // Trim todos los campos
  const trimmedState = state.trim();
  const trimmedCity = city.trim();
  const trimmedPostalCode = postalCode.trim();
  
  // Si es CDMX, aplicar normalización especial (case-insensitive, con/sin acentos)
  if (isCDMX(trimmedState, trimmedCity)) {
    // State y city siempre "Ciudad de Mexico" (sin acento) para Skydropx
    // No usar "Tlalpan" u otras delegaciones, Skydropx prefiere el nombre genérico
    return {
      state: "Ciudad de Mexico",
      city: "Ciudad de Mexico",
      postalCode: trimmedPostalCode,
    };
  }
  
  // Para otras direcciones, quitar acentos y mantener formato original (trimmed)
  return {
    state: removeAccents(trimmedState),
    city: removeAccents(trimmedCity),
    postalCode: trimmedPostalCode,
  };
}

