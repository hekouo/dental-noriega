/**
 * Sanitiza valores para logging seguro
 * Previene log injection y format string attacks
 */

/**
 * Sanitiza un valor para logging seguro
 * - Convierte a string
 * - Recorta longitud máxima
 * - Reemplaza caracteres de control (\r, \n, \t) por espacios
 * - Limita caracteres especiales que podrían ser interpretados por loggers
 */
export function sanitizeForLog(value: unknown, maxLength = 1000): string {
  if (value === null || value === undefined) {
    return String(value);
  }

  let str: string;
  if (typeof value === "string") {
    str = value;
  } else if (typeof value === "object") {
    // Para objetos, usar JSON.stringify pero limitar profundidad
    try {
      str = JSON.stringify(value);
    } catch {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  // Recortar longitud
  if (str.length > maxLength) {
    str = str.substring(0, maxLength) + "...[truncated]";
  }

  // Reemplazar caracteres de control por espacios
  str = str.replace(/[\r\n\t]/g, " ");

  // Remover caracteres de control restantes (excepto espacios)
  str = str.replace(/[\u0000-\u001f\u007f]/g, "");

  return str;
}

/**
 * Sanitiza un objeto completo para logging estructurado
 */
export function sanitizeObjectForLog<T extends Record<string, unknown>>(
  obj: T,
  maxLength = 1000,
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeForLog(value, maxLength);
  }
  return sanitized;
}
