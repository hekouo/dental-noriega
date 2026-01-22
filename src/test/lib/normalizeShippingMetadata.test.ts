import { describe, expect, it } from "vitest";

import { normalizeShippingMetadata } from "@/lib/shipping/normalizeShippingMetadata";

describe("normalizeShippingMetadata", () => {
  it("rellena rate_used desde shipping_pricing incluso si venía con nulls", () => {
    const metadata = {
      shipping_pricing: {
        carrier_cents: 10000,
        packaging_cents: 2000,
        margin_cents: 500,
        total_cents: 12500,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_123",
          provider: "skydropx",
          service: "express",
          carrier_cents: 1,
          price_cents: 2,
          customer_total_cents: 3,
        },
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(10000);
    expect(rateUsed.price_cents).toBe(12500);
    expect(rateUsed.customer_total_cents).toBe(12500);
  });
});
