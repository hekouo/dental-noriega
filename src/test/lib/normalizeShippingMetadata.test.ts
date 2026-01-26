import { describe, expect, it } from "vitest";

import { normalizeShippingMetadata } from "@/lib/shipping/normalizeShippingMetadata";

/** Fixture que reproduce el bug de producción: pricing con números, rate_used nulls, _last_write apply-rate */
const PRODUCTION_FIXTURE = {
  shipping_pricing: {
    carrier_cents: 14964,
    packaging_cents: 2000,
    margin_cents: 3671,
    total_cents: 21635,
  },
  shipping: {
    rate_used: {
      external_rate_id: "rate_xyz",
      provider: "skydropx",
      service: "express",
      carrier_cents: null,
      price_cents: null,
      customer_total_cents: null,
    },
    _last_write: { route: "apply-rate", at: "2025-01-22T00:00:00.000Z", sha: "abc1234" },
  },
} as const;

describe("normalizeShippingMetadata", () => {
  it("reproducción prod: pricing con números + rate_used nulls → normalizar rellena rate_used", () => {
    const metadata = { ...PRODUCTION_FIXTURE };
    const result = normalizeShippingMetadata(metadata, { source: "admin", orderId: "test" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.price_cents).toBe(21635);
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.customer_total_cents).toBe(21635);
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
  });

  it("backfill desde shipping_pricing aunque rate_used venga con nulls", () => {
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
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
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

  it("sobrescribe rate_used desde shipping_pricing incluso si venía con valores incorrectos", () => {
    const metadata = {
      shipping_pricing: {
        carrier_cents: 14964,
        packaging_cents: 2000,
        margin_cents: 3306,
        total_cents: 20270,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_456",
          provider: "skydropx",
          service: "standard",
          carrier_cents: 5000, // valor incorrecto
          price_cents: 8000, // valor incorrecto
          customer_total_cents: 9000, // valor incorrecto
        },
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    // Debe sobrescribir con valores de shipping_pricing (overwrite forzado)
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(20270);
    expect(rateUsed.customer_total_cents).toBe(20270);
  });

  it("garantiza que rate_used nunca queda con nulls cuando shipping_pricing existe (caso merge)", () => {
    // Simula un caso donde un endpoint hace merge después de normalizar
    const metadata = {
      shipping_pricing: {
        carrier_cents: 14964,
        packaging_cents: 2000,
        margin_cents: 3306,
        total_cents: 20270,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_789",
          provider: "skydropx",
          service: "express",
          carrier_cents: null, // null explícito
          price_cents: null, // null explícito
          customer_total_cents: null, // null explícito
        },
        // Simula que otro campo se agregó después
        tracking_number: "TRACK123",
      },
    };

    // Primera normalización
    const result1 = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    // Simula un merge incorrecto (bug que queremos prevenir)
    const badMerge = {
      ...metadata,
      shipping: {
        ...metadata.shipping,
        ...result1.shippingMeta,
        // Bug: reintroduce rate_used con nulls
        rate_used: {
          ...metadata.shipping.rate_used,
          tracking_number: "TRACK123", // campo adicional
        },
      },
    };

    // Re-normalizar después del merge (esto es lo que debe hacer cada endpoint)
    const result2 = normalizeShippingMetadata(badMerge, {
      source: "admin",
    });

    const rateUsed = result2.shippingMeta.rate_used as Record<string, unknown>;
    // Debe forzar overwrite incluso después del merge incorrecto
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(20270);
    expect(rateUsed.customer_total_cents).toBe(20270);
    // No debe quedar null nunca
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
  });

  it("Test B: con shipping_pricing y rate_used nulls → rate_used.price_cents === total_cents, rate_used.carrier_cents === carrier_cents", () => {
    const metadata = {
      shipping_pricing: { carrier_cents: 14964, packaging_cents: 2000, margin_cents: 3306, total_cents: 20270 },
      shipping: {
        rate_used: {
          external_rate_id: "r",
          provider: "skydropx",
          service: "s",
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
        },
      },
    };
    const result = normalizeShippingMetadata(metadata, { source: "admin" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.price_cents).toBe(metadata.shipping_pricing.total_cents);
    expect(rateUsed.carrier_cents).toBe(metadata.shipping_pricing.carrier_cents);
    expect(rateUsed.customer_total_cents).toBe(metadata.shipping_pricing.total_cents);
  });

  it("merge bug: pricing ok pero rate_used null → overwrite forzado rellena sin nulls", () => {
    const metadata = {
      shipping_pricing: { carrier_cents: 14964, total_cents: 20270 },
      shipping: {
        rate_used: { provider: "skydropx", service: "s", carrier_cents: null, price_cents: null, customer_total_cents: null },
        _last_write: { route: "apply-rate" },
      },
    };
    const result = normalizeShippingMetadata(metadata, { source: "admin" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(20270);
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
  });

  it("string numbers (JSON/DB): shipping_pricing total_cents/carrier_cents como string → rellena rate_used", () => {
    const metadata = {
      shipping_pricing: { carrier_cents: "14964" as unknown, total_cents: "21635" as unknown },
      shipping: { rate_used: { provider: "skydropx", service: "s", carrier_cents: null, price_cents: null } },
    };
    const result = normalizeShippingMetadata(metadata, { source: "admin" });
    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(14964);
    expect(rateUsed.price_cents).toBe(21635);
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
  });

  it("fallback: si falta shipping_pricing pero existe shipping.pricing, también rellena rate_used", () => {
    const metadata = {
      shipping: {
        pricing: {
          carrier_cents: 12000,
          packaging_cents: 1500,
          margin_cents: 800,
          total_cents: 14300,
        },
        rate_used: {
          external_rate_id: "rate_fb",
          provider: "skydropx",
          service: "express",
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
        },
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    expect(rateUsed.carrier_cents).toBe(12000);
    expect(rateUsed.price_cents).toBe(14300);
    expect(rateUsed.customer_total_cents).toBe(14300);
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
  });

  it("overwrite final: garantiza rate_used relleno incluso después de construcciones intermedias (simula apply-rate)", () => {
    // Simula el estado exacto que ocurre en producción después de apply-rate
    // donde shipping_pricing tiene números pero rate_used queda con nulls
    const metadata = {
      shipping_pricing: {
        carrier_cents: 14964,
        packaging_cents: 2000,
        margin_cents: 3671,
        total_cents: 21635,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_xyz",
          provider: "skydropx",
          service: "express",
          carrier_cents: null,
          price_cents: null,
          customer_total_cents: null,
        },
        // Simula que otros campos se agregaron después
        quoted_at: "2025-01-22T00:00:00.000Z",
        price_cents: 21635,
      },
    };

    const result = normalizeShippingMetadata(metadata, {
      source: "admin",
      orderId: "test-order-123",
    });

    const rateUsed = result.shippingMeta.rate_used as Record<string, unknown>;
    
    // Invariante: rate_used debe reflejar exactamente los valores de shipping_pricing
    expect(rateUsed.price_cents).toBe(metadata.shipping_pricing.total_cents);
    expect(rateUsed.carrier_cents).toBe(metadata.shipping_pricing.carrier_cents);
    expect(rateUsed.customer_total_cents).toBe(metadata.shipping_pricing.total_cents);
    
    // Nunca null cuando existe canonical pricing
    expect(rateUsed.price_cents).not.toBeNull();
    expect(rateUsed.carrier_cents).not.toBeNull();
    expect(rateUsed.customer_total_cents).not.toBeNull();
    
    // Otros campos deben preservarse
    expect(rateUsed.external_rate_id).toBe("rate_xyz");
    expect(rateUsed.provider).toBe("skydropx");
    expect(rateUsed.service).toBe("express");
  });

  it("end-to-end apply-rate: simula post-write verificando que rate_used persiste correctamente", () => {
    // Simula el flujo completo de apply-rate:
    // 1. Metadata inicial con shipping_pricing
    // 2. Normalización (simula lo que hace apply-rate)
    // 3. Construcción de finalMetadata (simula pre-write)
    // 4. Verificación de que post-write equivalente mantiene rate_used con números

    // Usar valores consistentes para evitar corrección por normalizeShippingPricing
    const carrierCents = 14964;
    const packagingCents = 2000;
    const marginCents = 3671;
    const totalCents = carrierCents + packagingCents + marginCents; // 21635

    const initialMetadata = {
      shipping_pricing: {
        carrier_cents: carrierCents,
        packaging_cents: packagingCents,
        margin_cents: marginCents,
        total_cents: totalCents,
        customer_total_cents: totalCents,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_xyz",
          provider: "skydropx",
          service: "express",
          carrier_cents: null, // null inicial (bug que queremos corregir)
          price_cents: null,
          customer_total_cents: null,
        },
      },
    };

    // Paso 1: Normalizar (simula normalizeShippingMetadata en apply-rate)
    const normalized = normalizeShippingMetadata(initialMetadata, {
      source: "admin",
      orderId: "test-order-123",
    });

    // Paso 2: Construir finalMetadata (simula lo que hace apply-rate antes del UPDATE)
    const metadataWithPricing: Record<string, unknown> = {
      ...initialMetadata,
      ...(normalized.shippingPricing ? { shipping_pricing: normalized.shippingPricing } : {}),
    };

    // Simular addShippingMetadataDebug (sin el helper real, solo verificar estructura)
    const finalShippingMeta = normalized.shippingMeta;
    const finalMetadata: Record<string, unknown> = {
      ...metadataWithPricing,
      shipping: finalShippingMeta,
    };

    // Paso 3: Verificar PRE-WRITE (lo que se va a enviar a Supabase)
    const preWriteRateUsed = (finalMetadata.shipping as Record<string, unknown>)
      ?.rate_used as Record<string, unknown> | null | undefined;
    const preWritePricing = finalMetadata.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
    } | null | undefined;

    expect(preWritePricing).toBeTruthy();
    expect(preWritePricing?.total_cents).toBe(totalCents);
    // rate_used debe usar valores RAW de canonical pricing (no corregidos)
    // El overwrite final usa canonicalPricing RAW, que tiene carrierCents original
    expect(preWriteRateUsed).toBeTruthy();
    expect(preWriteRateUsed?.price_cents).toBe(totalCents);
    expect(preWriteRateUsed?.carrier_cents).toBe(carrierCents); // RAW value, no corregido
    expect(preWriteRateUsed?.customer_total_cents).toBe(totalCents);

    // Paso 4: Simular POST-WRITE (lo que Supabase devolvería)
    // En un caso real, esto vendría de Supabase, pero aquí simulamos que es idéntico
    const postWriteMetadata = JSON.parse(JSON.stringify(finalMetadata)) as typeof finalMetadata;
    const postWriteShipping = postWriteMetadata.shipping as Record<string, unknown>;
    const postWriteRateUsed = postWriteShipping?.rate_used as {
      price_cents?: number | null;
      carrier_cents?: number | null;
      customer_total_cents?: number | null;
    } | null | undefined;
    const postWritePricing = postWriteMetadata.shipping_pricing as {
      total_cents?: number | null;
      carrier_cents?: number | null;
    } | null | undefined;

    // Verificar que POST-WRITE mantiene los valores (no hay trigger que los reescriba)
    expect(postWritePricing?.total_cents).toBe(totalCents);

    expect(postWriteRateUsed).toBeTruthy();
    expect(postWriteRateUsed?.price_cents).toBe(totalCents);
    expect(postWriteRateUsed?.carrier_cents).toBe(carrierCents); // RAW value
    expect(postWriteRateUsed?.customer_total_cents).toBe(totalCents);

    // Verificar invariante: rate_used debe reflejar canonical pricing RAW
    // Nota: rate_used usa valores RAW de canonical, no los valores corregidos de normalizedPricing
    expect(postWriteRateUsed?.price_cents).toBe(totalCents);
    expect(postWriteRateUsed?.carrier_cents).toBe(carrierCents);
    expect(postWriteRateUsed?.price_cents).not.toBeNull();
    expect(postWriteRateUsed?.carrier_cents).not.toBeNull();
  });
});
