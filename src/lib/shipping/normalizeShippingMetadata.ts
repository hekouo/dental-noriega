import {
  normalizeShippingPricing,
  type NormalizedShippingPricing,
} from "@/lib/shipping/normalizeShippingPricing";

type NormalizeContext = {
  source: "checkout" | "admin" | "create-label" | "apply-rate";
  orderId?: string;
};

type ShippingRateUsed = {
  external_rate_id?: string | null;
  rate_id?: string | null;
  provider?: string | null;
  service?: string | null;
  eta_min_days?: number | null;
  eta_max_days?: number | null;
  carrier_cents?: number | null;
  price_cents?: number | null;
  selection_source?: "checkout" | "admin";
  eta_policy?: string | null;
  eta_changed?: boolean | null;
};

type NormalizeResult = {
  shippingPricing: NormalizedShippingPricing | null;
  shippingMeta: Record<string, unknown>;
  mismatchDetected: boolean;
};

export function normalizeShippingMetadata(
  metadata: Record<string, unknown>,
  context: NormalizeContext,
): NormalizeResult {
  const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
  const rootPricing = (metadata.shipping_pricing as Record<string, unknown>) || null;
  const nestedPricing = (shippingMeta.pricing as Record<string, unknown>) || null;

  const basePricing = rootPricing ?? nestedPricing;
  const normalizedPricing = normalizeShippingPricing(basePricing || undefined);

  const mismatchDetected =
    Boolean(rootPricing && nestedPricing) &&
    JSON.stringify(rootPricing) !== JSON.stringify(nestedPricing);

  const nextShippingMeta: Record<string, unknown> = {
    ...shippingMeta,
  };

  if (normalizedPricing) {
    nextShippingMeta.pricing = normalizedPricing;
    nextShippingMeta.price_cents = normalizedPricing.total_cents;
  }

  const rateUsed = (shippingMeta.rate_used as ShippingRateUsed) || null;
  if (rateUsed) {
    const carrier =
      typeof rateUsed.carrier_cents === "number"
        ? rateUsed.carrier_cents
        : typeof rateUsed.price_cents === "number"
          ? rateUsed.price_cents
          : null;
    const price = typeof rateUsed.price_cents === "number" ? rateUsed.price_cents : carrier;
    nextShippingMeta.rate_used = {
      ...rateUsed,
      carrier_cents: carrier,
      price_cents: price,
      external_rate_id:
        rateUsed.external_rate_id || rateUsed.rate_id || (shippingMeta.rate_id as string) || null,
    };
  }

  if (context.source !== "checkout" && process.env.NODE_ENV !== "production") {
    console.log("[shipping-metadata] normalize:", {
      orderId: context.orderId || null,
      source: context.source,
      has_root_shipping_pricing: Boolean(rootPricing),
      has_nested_shipping_pricing: Boolean(nestedPricing),
      mismatch_detected: mismatchDetected,
      total_cents: normalizedPricing?.total_cents ?? null,
      carrier_cents: normalizedPricing?.carrier_cents ?? null,
      packaging_cents: normalizedPricing?.packaging_cents ?? null,
      margin_cents: normalizedPricing?.margin_cents ?? null,
    });
  }

  return {
    shippingPricing: normalizedPricing,
    shippingMeta: nextShippingMeta,
    mismatchDetected,
  };
}
