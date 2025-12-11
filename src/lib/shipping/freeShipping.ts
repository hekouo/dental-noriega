/**
 * Configuración de envío gratis
 * Envío gratis cuando el subtotal de productos es >= 2,000 MXN
 */

export const FREE_SHIPPING_THRESHOLD_MXN = 2000; // Umbral para envío gratis en MXN
export const FREE_SHIPPING_THRESHOLD_CENTS = 200000; // Umbral para envío gratis en centavos (2,000.00 MXN)

/**
 * Aplica la regla de envío gratis si el subtotal es >= umbral
 * @param productsSubtotalCents Subtotal de productos en centavos
 * @param shippingCostCents Costo de envío calculado en centavos
 * @returns Costo de envío final (0 si aplica envío gratis, sino el costo original)
 */
export function applyFreeShippingIfEligible({
  productsSubtotalCents,
  shippingCostCents,
}: {
  productsSubtotalCents: number;
  shippingCostCents: number;
}): number {
  const thresholdCents = FREE_SHIPPING_THRESHOLD_MXN * 100;
  
  if (productsSubtotalCents >= thresholdCents) {
    return 0;
  }
  
  return shippingCostCents;
}

/**
 * Calcula el progreso hacia el envío gratis
 * @param subtotalCents Subtotal de productos en centavos
 * @returns Objeto con información del progreso (reached, remainingCents, progressPercent)
 */
export function getFreeShippingProgress(subtotalCents: number) {
  if (subtotalCents <= 0) {
    return {
      reached: false,
      remainingCents: FREE_SHIPPING_THRESHOLD_CENTS,
      progressPercent: 0,
    };
  }

  const remainingCents = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents,
  );

  const progressPercent = Math.min(
    100,
    Math.round((subtotalCents / FREE_SHIPPING_THRESHOLD_CENTS) * 100),
  );

  return {
    reached: remainingCents <= 0,
    remainingCents,
    progressPercent,
  };
}

