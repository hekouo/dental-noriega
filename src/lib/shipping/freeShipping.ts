/**
 * Configuración de envío gratis
 * Envío gratis cuando el subtotal de productos es >= 2,000 MXN
 */

export const FREE_SHIPPING_THRESHOLD_MXN = 2000; // Umbral para envío gratis en MXN

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

