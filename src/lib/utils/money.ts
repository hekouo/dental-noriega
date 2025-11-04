// src/lib/utils/money.ts
/**
 * Utilidades robustas para manejo de dinero/precios
 */

/**
 * Convierte un valor desconocido a número de forma segura
 */
export function toNumberSafe(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;

  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : null;
  }

  return null;
}

/**
 * Formatea un valor como moneda MXN
 */
export function formatMXN(v: unknown): string {
  const n = toNumberSafe(v);
  if (n === null) return "—";

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(n);
}

