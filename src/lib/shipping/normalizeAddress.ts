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
 * - city: 
 *   - Si CP es 143xx (Tlalpan): "Tlalpan"
 *   - Si no: "Ciudad de Mexico"
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
    // State siempre "Ciudad de Mexico" (sin acento) para Skydropx
    const normalizedState = "Ciudad de Mexico";
    
    // City: si CP es 143xx (Tlalpan), usar "Tlalpan", sino "Ciudad de Mexico"
    let normalizedCity: string;
    if (/^143\d{2}$/.test(trimmedPostalCode)) {
      normalizedCity = "Tlalpan";
    } else {
      normalizedCity = "Ciudad de Mexico";
    }
    
    return {
      state: normalizedState,
      city: normalizedCity,
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

