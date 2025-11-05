// src/lib/orders/ref.ts
/**
 * Genera una referencia de orden legible
 * Formato: DDN-YYYYMMDD-XXXXX
 */
export function generateOrderRef(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const random = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `DDN-${year}${month}${day}-${random}`;
}

