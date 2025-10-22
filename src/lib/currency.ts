// src/lib/currency.ts
export function formatMXN(n?: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "";
  try {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `$${Math.round(n)} MXN`;
  }
}
