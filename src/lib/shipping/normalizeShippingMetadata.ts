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

  const rateUsedBefore = (shippingMeta.rate_used as ShippingRateUsed) || null;
  const rateUsed = (shippingMeta.rate_used as ShippingRateUsed) || {};
  const rateFromMeta = (shippingMeta.rate as ShippingRateUsed) || {};
  const shouldDeriveRate =
    Boolean(rateUsed) ||
    Boolean(rateFromMeta.external_rate_id) ||
    Boolean(rateFromMeta.rate_id) ||
    Boolean(normalizedPricing);

  if (shouldDeriveRate) {
    // FORCE OVERWRITE desde shipping_pricing cuando existe (incondicional)
    const carrierForced =
      typeof normalizedPricing?.carrier_cents === "number"
        ? normalizedPricing.carrier_cents
        : typeof rateUsed.carrier_cents === "number"
          ? rateUsed.carrier_cents
          : typeof rateFromMeta.carrier_cents === "number"
            ? rateFromMeta.carrier_cents
            : null;
    const priceForced =
      typeof normalizedPricing?.total_cents === "number"
        ? normalizedPricing.total_cents
        : typeof rateUsed.price_cents === "number"
          ? rateUsed.price_cents
          : typeof rateFromMeta.price_cents === "number"
            ? rateFromMeta.price_cents
            : carrierForced;
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

    // Construir rate_used con overwrite forzado de pricing (los valores forzados van al final para sobrescribir cualquier null del spread)
    nextShippingMeta.rate_used = {
      ...(rateUsed || {}),
      eta_min_days: etaMin,
      eta_max_days: etaMax,
      external_rate_id: externalRateId,
      selection_source: rateUsed.selection_source ?? (context.source === "checkout" ? "checkout" : "admin"),
      provider,
      service,
      // FORCE OVERWRITE: estos valores siempre sobrescriben, incluso si rateUsed tenía nulls
      carrier_cents: carrierForced,
      price_cents: priceForced,
      customer_total_cents:
        typeof normalizedPricing?.total_cents === "number"
          ? normalizedPricing.total_cents
          : typeof normalizedPricing?.customer_total_cents === "number"
            ? normalizedPricing.customer_total_cents
            : priceForced ?? null,
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
  const hasPricing = Boolean(normalizedPricing);
  const nullFieldsBefore = {
    carrier: rateUsedBefore?.carrier_cents == null,
    price: rateUsedBefore?.price_cents == null,
    eta_min: rateUsedBefore?.eta_min_days == null,
    eta_max: rateUsedBefore?.eta_max_days == null,
    provider: rateUsedBefore?.provider == null,
    service: rateUsedBefore?.service == null,
    external: rateUsedBefore?.external_rate_id == null && rateUsedBefore?.rate_id == null,
  };
  const nullFieldsAfter = {
    carrier: rateUsedLog?.carrier_cents == null,
    price: rateUsedLog?.price_cents == null,
    eta_min: rateUsedLog?.eta_min_days == null,
    eta_max: rateUsedLog?.eta_max_days == null,
    provider: rateUsedLog?.provider == null,
    service: rateUsedLog?.service == null,
    external: rateUsedLog?.external_rate_id == null && rateUsedLog?.rate_id == null,
  };

  if (context.source !== "checkout" && process.env.NODE_ENV !== "production") {
    console.log("[shipping-metadata] normalize:", {
      orderId: context.orderId || null,
      source: context.source,
      has_root_shipping_pricing: hasRoot,
      has_nested_shipping_pricing: hasNested,
      has_pricing: hasPricing,
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
      rate_used_null_fields_before: nullFieldsBefore,
      rate_used_null_fields_after: nullFieldsAfter,
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

/**
 * Agrega debug metadata para rastrear quién escribió metadata.shipping (solo server-side admin)
 */
export function addShippingMetadataDebug(
  shippingMeta: Record<string, unknown>,
  route: string,
): Record<string, unknown> {
  // Solo agregar debug en server-side (no en cliente)
  if (typeof process !== "undefined" && process.env) {
    return {
      ...shippingMeta,
      _last_write: {
        route,
        at: new Date().toISOString(),
        // SHA del commit actual si está disponible (opcional, no crítico)
        sha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "unknown",
      },
    };
  }
  return shippingMeta;
}
