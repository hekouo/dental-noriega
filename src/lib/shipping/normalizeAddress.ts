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
  wasAlcaldia?: string; // Si city original era una alcaldía (ej: "Tlalpan"), guardarla aquí
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
 * - city: "Ciudad de Mexico" (siempre, no usar "Tlalpan" u otras delegaciones/alcaldías)
 * 
 * Para otras direcciones:
 * - Quita acentos de city/state para consistencia
 * - Mantiene case original pero normalizado
 * 
 * @returns Dirección normalizada + información sobre si había alcaldía
 */
export function normalizeMxAddress(input: AddressInput): NormalizedAddress & {
  wasAlcaldia?: string; // Si city original era una alcaldía (ej: "Tlalpan"), guardarla aquí
} {
  const { state, city, postalCode } = input;
  
  // Trim todos los campos
  const trimmedState = state.trim();
  const trimmedCity = city.trim();
  const trimmedPostalCode = postalCode.trim();
  
  // Detectar si state es CDMX (incluso si city no lo es)
  const stateIsCDMX = isCDMX(trimmedState, "");
  const cityIsCDMX = isCDMX("", trimmedCity);
  const isCDMXAddress = stateIsCDMX || cityIsCDMX;
  
  // Si state es CDMX pero city NO es una variante de CDMX, entonces city es una alcaldía
  // Ej: state="Ciudad de México" + city="Tlalpan" → alcaldía
  const cityIsAlcaldia = stateIsCDMX && !cityIsCDMX && trimmedCity.length > 0 && trimmedCity.toLowerCase() !== "ciudad de mexico";
  const alcaldiaName = cityIsAlcaldia ? trimmedCity : undefined;
  
  if (isCDMXAddress) {
    // State y city siempre "Ciudad de Mexico" (sin acento) para Skydropx
    // No usar "Tlalpan" u otras delegaciones/alcaldías, Skydropx prefiere el nombre genérico
    return {
      state: "Ciudad de Mexico",
      city: "Ciudad de Mexico",
      postalCode: trimmedPostalCode,
      wasAlcaldia: alcaldiaName, // Guardar alcaldía original para moverla a neighborhood
    };
  }
  
  // Para otras direcciones, quitar acentos y mantener formato original (trimmed)
  return {
    state: removeAccents(trimmedState),
    city: removeAccents(trimmedCity),
    postalCode: trimmedPostalCode,
  };
}

