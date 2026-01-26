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
  customer_total_cents?: number | null;
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

const toNum = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

function resolveCanonicalPricing(metadata: Record<string, unknown>): Partial<NormalizedShippingPricing> | null {
  const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
  const root = metadata.shipping_pricing as Record<string, unknown> | null | undefined;
  const nested = shippingMeta.pricing as Record<string, unknown> | null | undefined;

  if (root && (toNum((root as { carrier_cents?: unknown }).carrier_cents) != null || toNum((root as { total_cents?: unknown }).total_cents) != null)) {
    return root as Partial<NormalizedShippingPricing>;
  }
  if (nested && (toNum((nested as { carrier_cents?: unknown }).carrier_cents) != null || toNum((nested as { total_cents?: unknown }).total_cents) != null)) {
    return nested as Partial<NormalizedShippingPricing>;
  }
  const total = toNum(metadata.shipping_cost_cents) ?? toNum(shippingMeta.price_cents);
  if (total != null && total >= 0) {
    return { total_cents: total, customer_total_cents: total } as Partial<NormalizedShippingPricing>;
  }
  return null;
}

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
  const canonicalPricingInput = resolveCanonicalPricing(metadata) ?? (hasRoot ? rootPricing : nestedPricing) ?? null;
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
    const canonCarrier = canonicalPricing ? toNum((canonicalPricing as { carrier_cents?: unknown }).carrier_cents) : null;
    const canonTotal = canonicalPricing ? toNum((canonicalPricing as { total_cents?: unknown }).total_cents) : null;
    const canonCustomerTotal = canonicalPricing
      ? toNum((canonicalPricing as { customer_total_cents?: unknown }).customer_total_cents)
      : null;
    const hasCanonicalNumbers = canonCarrier != null || canonTotal != null;

    let carrierForced: number | null;
    let priceForced: number | null;
    let customerTotalForced: number | null;

    if (hasCanonicalNumbers && canonicalPricing) {
      carrierForced = canonCarrier;
      priceForced = canonTotal;
      customerTotalForced = canonCustomerTotal ?? canonTotal;
    } else {
      carrierForced =
        toNum(rateUsed.carrier_cents) ?? toNum((rateFromMeta as { carrier_cents?: unknown }).carrier_cents) ?? null;
      priceForced =
        toNum(rateUsed.price_cents) ?? toNum((rateFromMeta as { price_cents?: unknown }).price_cents) ?? carrierForced;
      customerTotalForced = priceForced;
    }

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

    // Construir rate_used: provider/service/eta/external_rate_id de rate_used o shipping.rate;
    // carrier_cents, price_cents, customer_total_cents SIEMPRE desde canonical pricing cuando existe (nunca rate_used)
    nextShippingMeta.rate_used = {
      ...(rateUsed || {}),
      eta_min_days: etaMin,
      eta_max_days: etaMax,
      external_rate_id: externalRateId,
      selection_source: rateUsed.selection_source ?? (context.source === "checkout" ? "checkout" : "admin"),
      provider,
      service,
      carrier_cents: carrierForced,
      price_cents: priceForced,
      customer_total_cents: customerTotalForced ?? priceForced ?? null,
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

  // OVERWRITE FINAL: Garantizar que rate_used nunca quede con nulls cuando existe canonical pricing
  // Este es el último paso antes de retornar para evitar que merges/spreads posteriores reintroduzcan nulls
  if (canonicalPricing) {
    const canonCarrier = toNum((canonicalPricing as { carrier_cents?: unknown }).carrier_cents);
    const canonTotal = toNum((canonicalPricing as { total_cents?: unknown }).total_cents);
    const canonCustomerTotal = toNum((canonicalPricing as { customer_total_cents?: unknown }).customer_total_cents);
    const hasCanonicalNumbers = canonCarrier != null || canonTotal != null;

    if (hasCanonicalNumbers) {
      const currentRateUsed = (nextShippingMeta.rate_used as ShippingRateUsed) || {};
      // Overwrite incondicional desde canonical RAW pricing (no desde normalizedPricing corregido)
      nextShippingMeta.rate_used = {
        ...currentRateUsed,
        carrier_cents: canonCarrier ?? currentRateUsed.carrier_cents ?? null,
        price_cents: canonTotal ?? currentRateUsed.price_cents ?? null,
        customer_total_cents: canonCustomerTotal ?? canonTotal ?? currentRateUsed.customer_total_cents ?? null,
      };
    }
  }

  const rateUsedLog = nextShippingMeta.rate_used as ShippingRateUsed | undefined;
  const hasPricing = Boolean(normalizedPricing);
  const canonicalDetected = Boolean(canonicalPricing);
  const rateUsedOverwritten = Boolean(
    canonicalPricing &&
    (toNum((canonicalPricing as { carrier_cents?: unknown }).carrier_cents) != null ||
      toNum((canonicalPricing as { total_cents?: unknown }).total_cents) != null),
  );
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
      canonical_detected: canonicalDetected,
      rate_used_overwritten: rateUsedOverwritten,
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
  metadata?: Record<string, unknown>,
): Record<string, unknown> {
  // Solo agregar debug en server-side (no en cliente)
  if (typeof process !== "undefined" && process.env) {
    // Calcular si se detectó canonical pricing y si se hizo overwrite de rate_used
    const rootPricing = metadata?.shipping_pricing as Record<string, unknown> | null | undefined;
    const nestedPricing = shippingMeta.pricing as Record<string, unknown> | null | undefined;
    const rateUsed = shippingMeta.rate_used as ShippingRateUsed | null | undefined;
    
    const canonCarrier = rootPricing
      ? toNum((rootPricing as { carrier_cents?: unknown }).carrier_cents)
      : nestedPricing
        ? toNum((nestedPricing as { carrier_cents?: unknown }).carrier_cents)
        : null;
    const canonTotal = rootPricing
      ? toNum((rootPricing as { total_cents?: unknown }).total_cents)
      : nestedPricing
        ? toNum((nestedPricing as { total_cents?: unknown }).total_cents)
        : null;
    
    const canonicalDetected = canonCarrier != null || canonTotal != null;
    
    // rate_used_overwritten = true SOLO si:
    // 1. Existe canonical pricing con números
    // 2. rate_used tiene números (no null)
    // 3. Los números coinciden con canonical (probar que realmente se hizo overwrite)
    const rateUsedOverwritten = Boolean(
      canonicalDetected &&
      rateUsed &&
      rateUsed.carrier_cents != null &&
      rateUsed.price_cents != null &&
      (canonCarrier == null || rateUsed.carrier_cents === canonCarrier) &&
      (canonTotal == null || rateUsed.price_cents === canonTotal),
    );

    return {
      ...shippingMeta,
      _last_write: {
        route,
        at: new Date().toISOString(),
        // SHA del commit actual si está disponible (opcional, no crítico)
        sha: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "unknown",
        canonical_detected: canonicalDetected,
        rate_used_overwritten: rateUsedOverwritten,
      },
    };
  }
  return shippingMeta;
}
