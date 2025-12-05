/**
 * Escapa caracteres HTML especiales para prevenir XSS
 * @param value - String a escapar
 * @returns String escapado seguro para usar en HTML
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

