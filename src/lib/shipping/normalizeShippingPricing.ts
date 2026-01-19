type ShippingPricingInput = {
  carrier_cents?: number | null;
  packaging_cents?: number | null;
  margin_cents?: number | null;
  total_cents?: number | null;
  customer_total_cents?: number | null;
  customer_eta_min_days?: number | null;
  customer_eta_max_days?: number | null;
  corrected?: boolean;
  correction_reason?: string;
};

export type NormalizedShippingPricing = {
  carrier_cents: number;
  packaging_cents: number;
  margin_cents: number;
  total_cents: number;
  customer_total_cents: number;
  customer_eta_min_days?: number | null;
  customer_eta_max_days?: number | null;
  corrected?: boolean;
  correction_reason?: string;
};

const toNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export function normalizeShippingPricing(
  input: ShippingPricingInput | null | undefined,
): NormalizedShippingPricing | null {
  if (!input) return null;

  const packagingCents = Math.max(0, toNumber(input.packaging_cents) ?? 0);
  const marginCents = Math.max(0, toNumber(input.margin_cents) ?? 0);
  const totalCents = toNumber(input.total_cents) ?? toNumber(input.customer_total_cents);
  const carrierCents = toNumber(input.carrier_cents);

  let resolvedCarrier = carrierCents ?? 0;
  let resolvedTotal = totalCents ?? resolvedCarrier + packagingCents + marginCents;
  let corrected = false;
  let correctionReason: string | undefined;

  if (typeof totalCents === "number" && totalCents >= 0 && (packagingCents > 0 || marginCents > 0)) {
    const expectedCarrier = Math.max(0, totalCents - packagingCents - marginCents);
    if (carrierCents === null || carrierCents !== expectedCarrier) {
      resolvedCarrier = expectedCarrier;
      corrected = true;
      correctionReason = "mismatch_total_vs_components";
    }
  } else if (typeof carrierCents === "number") {
    const expectedTotal = carrierCents + packagingCents + marginCents;
    if (totalCents === null || totalCents !== expectedTotal) {
      resolvedTotal = expectedTotal;
      corrected = true;
      correctionReason = "mismatch_total_vs_components";
    }
  }

  if (resolvedTotal !== resolvedCarrier + packagingCents + marginCents) {
    resolvedTotal = resolvedCarrier + packagingCents + marginCents;
    corrected = true;
    correctionReason = "mismatch_total_vs_components";
  }

  return {
    carrier_cents: resolvedCarrier,
    packaging_cents: packagingCents,
    margin_cents: marginCents,
    total_cents: resolvedTotal,
    customer_total_cents: resolvedTotal,
    customer_eta_min_days: toNumber(input.customer_eta_min_days),
    customer_eta_max_days: toNumber(input.customer_eta_max_days),
    corrected: corrected || input.corrected || false,
    correction_reason: correctionReason ?? input.correction_reason,
  };
}
