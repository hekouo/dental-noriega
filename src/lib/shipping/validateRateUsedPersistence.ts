/**
 * Validación canary: Verifica que rate_used.*_cents persiste correctamente después de write
 * 
 * Esta función se ejecuta después de un update para detectar si rate_used.*_cents
 * quedó NULL aunque shipping_pricing tenga números (bug de persistencia).
 */

import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";

type RateUsedValidationResult = {
  isValid: boolean;
  hasCanonicalPricing: boolean;
  rateUsedHasNumbers: boolean;
  discrepancy: boolean;
};

/**
 * Valida que rate_used.*_cents persista cuando hay canonical pricing
 * 
 * @param rawDbMetadata Metadata leído directamente de DB (sin normalizadores)
 * @param orderId Order ID para logging
 * @param routeName Nombre del endpoint (ej: "apply-rate", "requote")
 * @returns Resultado de validación
 */
export function validateRateUsedPersistence(
  rawDbMetadata: Record<string, unknown> | null | undefined,
  orderId: string,
  routeName: string,
): RateUsedValidationResult {
  if (!rawDbMetadata) {
    return {
      isValid: false,
      hasCanonicalPricing: false,
      rateUsedHasNumbers: false,
      discrepancy: false,
    };
  }

  // Extraer shipping_pricing y rate_used directamente desde DB (sin normalizadores)
  const shippingPricing = rawDbMetadata.shipping_pricing as {
    total_cents?: number | string | null;
    carrier_cents?: number | string | null;
  } | null | undefined;

  const shippingMeta = (rawDbMetadata.shipping as Record<string, unknown>) || null;
  const rateUsed = (shippingMeta?.rate_used as Record<string, unknown>) || null;

  // Verificar si shipping_pricing tiene números (canonical pricing)
  const pricingTotal = shippingPricing?.total_cents;
  const pricingCarrier = shippingPricing?.carrier_cents;
  
  const hasCanonicalPricing = !!(
    (typeof pricingTotal === "number" && pricingTotal > 0) ||
    (typeof pricingTotal === "string" && /^\d+$/.test(pricingTotal) && parseInt(pricingTotal, 10) > 0) ||
    (typeof pricingCarrier === "number" && pricingCarrier > 0) ||
    (typeof pricingCarrier === "string" && /^\d+$/.test(pricingCarrier) && parseInt(pricingCarrier, 10) > 0)
  );

  // Verificar si rate_used tiene números
  const rateUsedPrice = rateUsed?.price_cents;
  const rateUsedCarrier = rateUsed?.carrier_cents;
  
  const rateUsedHasNumbers = !!(
    (typeof rateUsedPrice === "number" && rateUsedPrice > 0) ||
    (typeof rateUsedPrice === "string" && /^\d+$/.test(rateUsedPrice) && parseInt(rateUsedPrice, 10) > 0) ||
    (typeof rateUsedCarrier === "number" && rateUsedCarrier > 0) ||
    (typeof rateUsedCarrier === "string" && /^\d+$/.test(rateUsedCarrier) && parseInt(rateUsedCarrier, 10) > 0)
  );

  // Discrepancia: hay canonical pricing pero rate_used no tiene números
  const discrepancy = hasCanonicalPricing && !rateUsedHasNumbers;

  if (discrepancy) {
    // CRITICAL: Log estructurado y sanitizado para prevenir log injection
    const sanitizedOrderId = sanitizeForLog(orderId);
    console.error(`[${routeName}] CRITICAL CANARY: shipping_pricing tiene números pero rate_used.*_cents es NULL/missing`, {
      orderId: sanitizedOrderId,
      route: routeName,
      shippingPricing: {
        totalCents: pricingTotal,
        carrierCents: pricingCarrier,
      },
      rateUsed: {
        priceCents: rateUsedPrice,
        carrierCents: rateUsedCarrier,
      },
      rawDbShipping: shippingMeta,
      rawDbShippingPricing: shippingPricing,
    });
  }

  return {
    isValid: !discrepancy,
    hasCanonicalPricing,
    rateUsedHasNumbers,
    discrepancy,
  };
}
