/**
 * Helper CRÍTICO: Merge rate_used preservando price_cents y carrier_cents
 * 
 * Garantiza que rate_used.*_cents nunca quede null cuando hay canonical pricing.
 * 
 * Reglas de merge:
 * 1. price_cents := incoming.price_cents ?? existing.price_cents ?? shipping_pricing.total_cents
 * 2. carrier_cents := incoming.carrier_cents ?? existing.carrier_cents ?? shipping_pricing.carrier_cents
 * 3. Preserva todos los demás campos de rate_used (rate_id, provider, service, etc.)
 * 
 * @param existing - rate_used existente (de DB o metadata actual)
 * @param incoming - rate_used que viene del writer
 * @param shippingPricing - canonical pricing (shipping_pricing)
 * @returns rate_used mergeado con cents garantizados
 */
export function mergeRateUsedPreserveCents(
  existing: Record<string, unknown> | null | undefined,
  incoming: Record<string, unknown> | null | undefined,
  shippingPricing: {
    total_cents?: number | null;
    carrier_cents?: number | null;
    customer_total_cents?: number | null;
  } | null | undefined,
): Record<string, unknown> {
  const existingRateUsed = existing || {};
  const incomingRateUsed = incoming || {};
  
  // Extraer valores de canonical pricing
  const canonTotal = shippingPricing?.total_cents ?? null;
  const canonCarrier = shippingPricing?.carrier_cents ?? null;
  const canonCustomerTotal = shippingPricing?.customer_total_cents ?? canonTotal ?? null;
  
  // Extraer valores existentes
  const existingPrice = existingRateUsed.price_cents as number | null | undefined;
  const existingCarrier = existingRateUsed.carrier_cents as number | null | undefined;
  const existingCustomerTotal = existingRateUsed.customer_total_cents as number | null | undefined;
  
  // Extraer valores incoming
  const incomingPrice = incomingRateUsed.price_cents as number | null | undefined;
  const incomingCarrier = incomingRateUsed.carrier_cents as number | null | undefined;
  const incomingCustomerTotal = incomingRateUsed.customer_total_cents as number | null | undefined;
  
  // Merge con prioridad: incoming > existing > canonical
  const mergedPrice = incomingPrice ?? existingPrice ?? canonTotal;
  const mergedCarrier = incomingCarrier ?? existingCarrier ?? canonCarrier;
  const mergedCustomerTotal = incomingCustomerTotal ?? existingCustomerTotal ?? canonCustomerTotal;
  
  // Construir rate_used mergeado preservando todos los campos
  return {
    ...existingRateUsed,
    ...incomingRateUsed,
    // FORZAR valores de cents (nunca null si hay canonical)
    price_cents: mergedPrice,
    carrier_cents: mergedCarrier,
    customer_total_cents: mergedCustomerTotal,
  };
}
