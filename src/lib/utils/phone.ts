/**
 * Normaliza un número de teléfono a formato E.164 para México
 * 
 * Reglas:
 * - Quita espacios, guiones, paréntesis y otros caracteres no numéricos
 * - Si tiene 10 dígitos y empieza con "55", "56", "81", etc. (celular típico MX) → antepone "52"
 * - Si ya empieza con "52" y tiene 12 dígitos → usa tal cual
 * - En cualquier otro caso → retorna null (número inválido)
 * 
 * @param raw - Número de teléfono en cualquier formato (string, number, null, undefined)
 * @returns Número en formato E.164 (ej: "525551234567") o null si es inválido
 */
export function normalizePhoneToE164Mx(raw: unknown): string | null {
  if (!raw) return null;

  // Convertir a string y limpiar
  let cleaned = String(raw).trim();

  // Quitar espacios, guiones, paréntesis y otros caracteres no numéricos
  cleaned = cleaned.replace(/[\s\-().]/g, "");

  // Si no quedan solo dígitos, es inválido
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  // Si ya empieza con "52" y tiene 12 dígitos, es válido
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    return cleaned;
  }

  // Si tiene 10 dígitos, probablemente es un número mexicano sin código de país
  if (cleaned.length === 10) {
    // Verificar que empiece con un código de área válido para celular mexicano
    // Códigos comunes: 55 (CDMX), 56 (Estado de México), 81 (Monterrey), 33 (Guadalajara), etc.
    const areaCode = cleaned.substring(0, 2);
    const validAreaCodes = [
      "55", "56", "81", "33", "22", "44", "66", "99", "83", "89", "98", "87",
      "61", "62", "63", "64", "65", "67", "68", "69", "71", "72", "73", "74",
      "75", "76", "77", "78", "79", "84", "85", "86", "88", "91", "92", "93",
      "94", "95", "96", "97",
    ];
    
    if (validAreaCodes.includes(areaCode)) {
      return `52${cleaned}`;
    }
  }

  // Si tiene 11 dígitos y empieza con "1" (código de país alternativo), quitar el 1 y agregar 52
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    const withoutOne = cleaned.substring(1);
    if (withoutOne.length === 10) {
      const areaCode = withoutOne.substring(0, 2);
      const validAreaCodes = [
        "55", "56", "81", "33", "22", "44", "66", "99", "83", "89", "98", "87",
        "61", "62", "63", "64", "65", "67", "68", "69", "71", "72", "73", "74",
        "75", "76", "77", "78", "79", "84", "85", "86", "88", "91", "92", "93",
        "94", "95", "96", "97",
      ];
      if (validAreaCodes.includes(areaCode)) {
        return `52${withoutOne}`;
      }
    }
  }

  // Cualquier otro caso es inválido
  return null;
}

/**
 * Formatea un número E.164 a formato legible para México
 * Ej: "525551234567" → "+52 55 1234 5678"
 * 
 * @param e164 - Número en formato E.164
 * @returns Número formateado o el original si no se puede formatear
 */
export function formatE164ToReadable(e164: string): string {
  if (!e164 || !e164.startsWith("52")) {
    return e164;
  }

  // Quitar el "52" inicial
  const withoutCountry = e164.substring(2);

  if (withoutCountry.length === 10) {
    // Formato: +52 XX XXXX XXXX
    const areaCode = withoutCountry.substring(0, 2);
    const firstPart = withoutCountry.substring(2, 6);
    const secondPart = withoutCountry.substring(6, 10);
    return `+52 ${areaCode} ${firstPart} ${secondPart}`;
  }

  return `+${e164}`;
}

