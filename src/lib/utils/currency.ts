/**
 * Utilidades para formateo de moneda MXN
 */

/**
 * Convierte centavos a pesos MXN
 * @param cents - Cantidad en centavos
 * @returns Cantidad en pesos (redondeada)
 */
export function mxnFromCents(cents: number): number {
  return Math.max(0, Math.round(cents ?? 0)) / 100;
}

/**
 * Formatea un valor numérico como moneda MXN
 * @param value - Valor en pesos MXN
 * @returns String formateado como moneda MXN
 */
export function formatMXN(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea centavos directamente como moneda MXN
 * @param cents - Cantidad en centavos
 * @returns String formateado como moneda MXN
 */
export function formatMXNFromCents(cents: number): string {
  return formatMXN(mxnFromCents(cents));
}

/**
 * Formatea precio con descuento
 * @param originalCents - Precio original en centavos
 * @param discountPercent - Porcentaje de descuento (0-100)
 * @returns Objeto con precio original y con descuento formateados
 */
export function formatPriceWithDiscount(
  originalCents: number,
  discountPercent: number = 0,
) {
  const original = mxnFromCents(originalCents);
  const discount = original * (discountPercent / 100);
  const discounted = original - discount;

  return {
    original: formatMXN(original),
    discounted: formatMXN(discounted),
    savings: formatMXN(discount),
  };
}
