import type { SkydropxRate } from "@/lib/shipping/skydropx.server";

type NormalizedRate = {
  external_id: string;
  provider: string;
  service: string;
  option_code?: string;
  carrier_cents: number;
  packaging_cents?: number;
  total_cents?: number;
  customer_total_cents?: number;
  eta_min_days: number | null;
  eta_max_days: number | null;
};

type NormalizeMode = "checkout" | "admin";

type NormalizeOptions = {
  packagingCents?: number;
  mode: NormalizeMode;
};

const normalizeEta = (rate: SkydropxRate) => {
  const etaMin = typeof rate.etaMinDays === "number" ? rate.etaMinDays : null;
  const etaMax = typeof rate.etaMaxDays === "number" ? rate.etaMaxDays : null;
  return {
    eta_min_days: etaMin,
    eta_max_days: etaMax,
  };
};

export function normalizeSkydropxRates(
  rawRates: SkydropxRate[],
  options: NormalizeOptions,
): NormalizedRate[] {
  const packagingCents = options.packagingCents ?? 0;
  const normalized = rawRates.map((rate) => {
    const carrierCents = rate.totalPriceCents;
    const { eta_min_days, eta_max_days } = normalizeEta(rate);
    const base: NormalizedRate = {
      external_id: rate.externalRateId,
      provider: rate.provider,
      service: rate.service,
      option_code: undefined,
      carrier_cents: carrierCents,
      eta_min_days,
      eta_max_days,
    };

    if (options.mode === "checkout") {
      const total = carrierCents + packagingCents;
      return {
        ...base,
        packaging_cents: packagingCents,
        total_cents: total,
      };
    }

    return {
      ...base,
      packaging_cents: packagingCents || undefined,
      customer_total_cents: packagingCents ? carrierCents + packagingCents : undefined,
    };
  });

  const etaForSort = (rate: NormalizedRate) =>
    rate.eta_min_days ?? rate.eta_max_days ?? Number.MAX_SAFE_INTEGER;

  if (options.mode === "checkout") {
    return normalized.sort((a, b) => {
      const totalA = a.total_cents ?? a.carrier_cents;
      const totalB = b.total_cents ?? b.carrier_cents;
      if (totalA !== totalB) return totalA - totalB;
      return etaForSort(a) - etaForSort(b);
    });
  }

  return normalized.sort((a, b) => {
    if (a.carrier_cents !== b.carrier_cents) return a.carrier_cents - b.carrier_cents;
    return etaForSort(a) - etaForSort(b);
  });
}
