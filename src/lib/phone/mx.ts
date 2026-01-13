/**
 * Utilidades para normalización y validación de números telefónicos mexicanos
 * Formato esperado: 10 dígitos (sin código de país)
 * Ejemplo: "5512345678"
 */

/**
 * Extrae solo los dígitos de una cadena
 */
export function sanitizeDigits(input: string): string {
  return input.replace(/\D/g, "");
}

/**
 * Valida que la cadena contenga exactamente 10 dígitos
 */
export function isValidMx10(digits: string): boolean {
  return /^\d{10}$/.test(digits);
}

/**
 * Convierte 10 dígitos a formato E.164 (con código de país)
 * Ejemplo: "5512345678" -> "+525512345678"
 */
export function toMxE164(digits10: string): string {
  if (!isValidMx10(digits10)) {
    throw new Error("Se requieren exactamente 10 dígitos para formato E.164");
  }
  return `+52${digits10}`;
}

/**
 * Convierte 10 dígitos a formato WhatsApp (con código 521)
 * Ejemplo: "5512345678" -> "5215512345678"
 * Nota: WhatsApp requiere código 521 para México (no 52)
 */
export function toMxWhatsAppDigits(digits10: string): string {
  if (!isValidMx10(digits10)) {
    throw new Error("Se requieren exactamente 10 dígitos para formato WhatsApp");
  }
  return `521${digits10}`;
}

/**
 * Normaliza un input de teléfono mexicano a 10 dígitos
 * Acepta varios formatos comunes:
 * - "+525512345678" -> "5512345678"
 * - "525512345678" -> "5512345678"
 * - "5215512345678" -> "5512345678"
 * - "5512345678" -> "5512345678"
 * - "55 1234 5678" -> "5512345678"
 * 
 * @returns Los últimos 10 dígitos encontrados, o string vacío si no hay suficientes dígitos
 */
export function normalizeToMx10(input: string): string {
  const digits = sanitizeDigits(input);
  
  // Si ya son exactamente 10 dígitos, retornar
  if (digits.length === 10) {
    return digits;
  }
  
  // Si tiene más de 10 dígitos, puede tener código de país
  // Intentar extraer los últimos 10 dígitos
  if (digits.length > 10) {
    // Si comienza con 52 o 521, tomar los últimos 10
    if (digits.startsWith("52") || digits.startsWith("521")) {
      return digits.slice(-10);
    }
    // Si tiene más de 10 dígitos sin código conocido, tomar los últimos 10
    return digits.slice(-10);
  }
  
  // Si tiene menos de 10 dígitos, retornar tal cual (el caller debe validar)
  return digits;
}
