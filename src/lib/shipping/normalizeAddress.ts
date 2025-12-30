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
 * Detecta si una dirección es de CDMX (Ciudad de México)
 * Acepta variaciones: "Ciudad de México", "Ciudad de Mexico", "cdmx", "df", "distrito federal", etc.
 */
function isCDMX(state: string, city: string): boolean {
  const normalizedState = state.trim().toLowerCase();
  const normalizedCity = city.trim().toLowerCase();
  
  const cdmxVariations = [
    "ciudad de méxico",
    "ciudad de mexico",
    "cdmx",
    "df",
    "distrito federal",
    "mexico city",
    "ciudad de mexico",
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
 * Para otras direcciones: devuelve strings originales (trimmed)
 */
export function normalizeMxAddress(input: AddressInput): NormalizedAddress {
  const { state, city, postalCode } = input;
  
  // Trim todos los campos
  const trimmedState = state.trim();
  const trimmedCity = city.trim();
  const trimmedPostalCode = postalCode.trim();
  
  // Si es CDMX, aplicar normalización especial
  if (isCDMX(trimmedState, trimmedCity)) {
    // State y city siempre "Ciudad de Mexico" (sin acento) para Skydropx
    // No usar "Tlalpan" u otras delegaciones, Skydropx prefiere el nombre genérico
    return {
      state: "Ciudad de Mexico",
      city: "Ciudad de Mexico",
      postalCode: trimmedPostalCode,
    };
  }
  
  // Para otras direcciones, devolver strings originales (trimmed)
  return {
    state: trimmedState,
    city: trimmedCity,
    postalCode: trimmedPostalCode,
  };
}

