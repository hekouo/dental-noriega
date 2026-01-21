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
  corrected: boolean;
  correctionReason?: string;
};

const slugifyOptionCode = (provider: string | null, service: string | null): string | null => {
  if (!provider || !service) return null;
  return `${provider}_${service}`
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
};

export function normalizeShippingMetadata(
  metadata: Record<string, unknown>,
  context: NormalizeContext,
): NormalizeResult {
  const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
  const rootPricing = (metadata.shipping_pricing as Record<string, unknown>) || null;
  const nestedPricing = (shippingMeta.pricing as Record<string, unknown>) || null;

  const hasRoot = Boolean(rootPricing);
  const hasNested = Boolean(nestedPricing);
  const mismatchDetected = hasRoot && hasNested && JSON.stringify(rootPricing) !== JSON.stringify(nestedPricing);
  const canonicalPricingInput = hasRoot ? rootPricing : nestedPricing;
  const canonicalPricing = canonicalPricingInput as Partial<NormalizedShippingPricing> | null;
  const normalizedPricing = normalizeShippingPricing(canonicalPricingInput || undefined);

  const correctionHappened =
    normalizedPricing != null &&
    canonicalPricing != null &&
    Boolean(
      (typeof canonicalPricing.carrier_cents === "number" &&
        canonicalPricing.carrier_cents !== normalizedPricing.carrier_cents) ||
        (typeof canonicalPricing.packaging_cents === "number" &&
          canonicalPricing.packaging_cents !== normalizedPricing.packaging_cents) ||
        (typeof canonicalPricing.margin_cents === "number" &&
          canonicalPricing.margin_cents !== normalizedPricing.margin_cents) ||
        (typeof canonicalPricing.total_cents === "number" &&
          canonicalPricing.total_cents !== normalizedPricing.total_cents),
    );

  const nextShippingMeta: Record<string, unknown> = {
    ...shippingMeta,
  };

  if (normalizedPricing) {
    nextShippingMeta.pricing = { ...normalizedPricing };
    nextShippingMeta.price_cents = normalizedPricing.total_cents;
    metadata.shipping_cost_cents = normalizedPricing.total_cents;
  }

  const rateUsed = (shippingMeta.rate_used as ShippingRateUsed) || {};
  const rateFromMeta = (shippingMeta.rate as ShippingRateUsed) || {};
  const shouldDeriveRate =
    Boolean(rateUsed) ||
    Boolean(rateFromMeta.external_rate_id) ||
    Boolean(rateFromMeta.rate_id) ||
    Boolean(normalizedPricing);

  if (shouldDeriveRate) {
    const carrierFromPricing = normalizedPricing?.carrier_cents;
    const carrier =
      typeof carrierFromPricing === "number"
        ? carrierFromPricing
        : typeof rateUsed.carrier_cents === "number"
          ? rateUsed.carrier_cents
          : typeof rateFromMeta.carrier_cents === "number"
            ? rateFromMeta.carrier_cents
            : 0;
    const totalFromPricing = normalizedPricing?.total_cents;
    const price =
      typeof totalFromPricing === "number"
        ? totalFromPricing
        : typeof rateUsed.price_cents === "number"
          ? rateUsed.price_cents
          : carrier;
    const externalRateId =
      rateUsed.external_rate_id ||
      rateUsed.rate_id ||
      rateFromMeta.external_rate_id ||
      rateFromMeta.rate_id ||
      (shippingMeta.rate_id as string) ||
      null;
    const provider = rateUsed.provider ?? rateFromMeta.provider ?? null;
    const service = rateUsed.service ?? rateFromMeta.service ?? null;
    const etaMin = rateUsed.eta_min_days ?? rateFromMeta.eta_min_days ?? null;
    const etaMax = rateUsed.eta_max_days ?? rateFromMeta.eta_max_days ?? null;

    nextShippingMeta.rate_used = {
      ...(rateUsed || {}),
      eta_min_days: etaMin,
      eta_max_days: etaMax,
      carrier_cents: carrier,
      price_cents: price,
      external_rate_id: externalRateId,
<<<<<<< HEAD
      selection_source: rateUsed.selection_source ?? (context.source === "checkout" ? "checkout" : "admin"),
      customer_total_cents:
        typeof normalizedPricing?.customer_total_cents === "number"
          ? normalizedPricing.customer_total_cents
          : price ?? null,
      provider,
      service,
    };

    const rateUsedFinal = nextShippingMeta.rate_used as ShippingRateUsed;
    const derivedRateExternalId =
      rateUsedFinal.external_rate_id ||
      rateUsedFinal.rate_id ||
      rateFromMeta.external_rate_id ||
      rateFromMeta.rate_id ||
      null;
    const derivedProvider = rateUsedFinal.provider ?? null;
    const derivedService = rateUsedFinal.service ?? null;
    const derivedEtaMin = rateUsedFinal.eta_min_days ?? null;
    const derivedEtaMax = rateUsedFinal.eta_max_days ?? null;
    nextShippingMeta.rate = {
      external_id: derivedRateExternalId,
      provider: derivedProvider,
      service: derivedService,
      eta_min_days: derivedEtaMin,
      eta_max_days: derivedEtaMax,
    };
    nextShippingMeta.rate_id = derivedRateExternalId;

    nextShippingMeta.option_code = slugifyOptionCode(derivedProvider, derivedService);
  }

  const rateUsedLog = nextShippingMeta.rate_used as ShippingRateUsed | undefined;

  if (context.source !== "checkout" && process.env.NODE_ENV !== "production") {
    console.log("[shipping-metadata] normalize:", {
      orderId: context.orderId || null,
      source: context.source,
      has_root_shipping_pricing: hasRoot,
      has_nested_shipping_pricing: hasNested,
      mismatch_detected: mismatchDetected,
      total_cents: normalizedPricing?.total_cents ?? null,
      carrier_cents: normalizedPricing?.carrier_cents ?? null,
      packaging_cents: normalizedPricing?.packaging_cents ?? null,
      margin_cents: normalizedPricing?.margin_cents ?? null,
      corrected: correctionHappened || normalizedPricing?.corrected || false,
      correction_reason: normalizedPricing?.correction_reason || null,
      updated_option_code: (nextShippingMeta.option_code as string | null) ?? null,
      derived_rate_external_id: (nextShippingMeta.rate_id as string | null) ?? null,
      provider: rateUsedLog?.provider ?? null,
      service: rateUsedLog?.service ?? null,
    });
  }

  const correctedFlag = correctionHappened || normalizedPricing?.corrected || false;
  const correctionReason = correctedFlag ? normalizedPricing?.correction_reason : undefined;

  return {
    shippingPricing: normalizedPricing,
    shippingMeta: nextShippingMeta,
    mismatchDetected,
    corrected: correctedFlag,
    correctionReason,
  };
}
