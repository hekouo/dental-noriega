import { describe, expect, it } from "vitest";

import { normalizeShippingMetadata, preserveRateUsed, ensureRateUsedInMetadata } from "@/lib/shipping/normalizeShippingMetadata";

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

  it("end-to-end apply-rate: simula construcción de finalMetadata y valida que rate_used persiste correctamente", () => {
    // Simula el flujo completo de apply-rate:
    // 1. updatedMetadata con shipping_pricing y rate_used inicial
    // 2. normalizeShippingMetadata
    // 3. Construcción de finalMetadata (como en apply-rate/route.ts)
    // 4. Validación de que rate_used tiene números (post-write equivalent)

    const updatedMetadata: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 14964,
        packaging_cents: 2000,
        margin_cents: 3671,
        total_cents: 21635,
        customer_total_cents: 21635,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_xyz",
          provider: "skydropx",
          service: "express",
          carrier_cents: null, // null inicial (bug que queremos prevenir)
          price_cents: null, // null inicial
          customer_total_cents: null,
        },
        quoted_at: "2025-01-22T00:00:00.000Z",
      },
    };

    // Paso 2: Normalizar (como en apply-rate)
    const normalized = normalizeShippingMetadata(updatedMetadata, {
      source: "admin",
      orderId: "test-order-123",
    });

    // Paso 3: Construir finalMetadata (como en apply-rate/route.ts)
    const metadataWithPricing: Record<string, unknown> = {
      ...updatedMetadata,
      ...(normalized.shippingPricing ? { shipping_pricing: normalized.shippingPricing } : {}),
    };

    // Simular addShippingMetadataDebug (sin el helper real para no depender de process.env)
    const finalShippingMeta = {
      ...normalized.shippingMeta,
      _last_write: {
        route: "apply-rate",
        at: new Date().toISOString(),
        sha: "test123",
        canonical_detected: true,
        rate_used_overwritten: true,
      },
    };

    const finalMetadata: Record<string, unknown> = {
      ...metadataWithPricing,
      shipping: finalShippingMeta,
    };

    // Paso 4: Validación post-write equivalent
    const postWriteShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const postWriteRateUsed = postWriteShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
      customer_total_cents?: number | null;
    };
    const postWritePricing = finalMetadata.shipping_pricing as {
      carrier_cents?: number | null;
      total_cents?: number | null;
    };

    // Invariantes: rate_used debe reflejar exactamente shipping_pricing (usando valores normalizados)
    expect(postWritePricing).toBeTruthy();
    expect(postWritePricing.total_cents).toBe(21635);
    // carrier_cents puede ser corregido por normalizeShippingPricing si hay inconsistencia
    expect(typeof postWritePricing.carrier_cents).toBe("number");
    expect(postWritePricing.carrier_cents).toBeGreaterThan(0);

    expect(postWriteRateUsed).toBeTruthy();
    // rate_used debe reflejar los valores RAW de canonical pricing (no los corregidos)
    // Pero en este test, validamos que al menos tiene números y coincide con total_cents
    expect(postWriteRateUsed.price_cents).toBe(postWritePricing.total_cents);
    expect(typeof postWriteRateUsed.carrier_cents).toBe("number");
    expect(postWriteRateUsed.carrier_cents).toBeGreaterThan(0);
    expect(postWriteRateUsed.customer_total_cents).toBe(postWritePricing.total_cents);

    // Nunca null cuando existe canonical pricing
    expect(postWriteRateUsed.price_cents).not.toBeNull();
    expect(postWriteRateUsed.carrier_cents).not.toBeNull();
    expect(postWriteRateUsed.customer_total_cents).not.toBeNull();

    // Validar que _last_write tiene los flags correctos
    const lastWrite = postWriteShippingMeta._last_write as Record<string, unknown>;
    expect(lastWrite.canonical_detected).toBe(true);
    expect(lastWrite.rate_used_overwritten).toBe(true);
  });

  it("secuencia apply-rate -> create-label: rate_used persiste después de create-label", () => {
    // Simula el flujo completo:
    // 1. apply-rate escribe metadata con rate_used lleno
    // 2. create-label lee metadata, agrega label_creation, y debe preservar rate_used

    // Paso 1: Estado después de apply-rate (metadata con rate_used lleno)
    const metadataAfterApplyRate: Record<string, unknown> = {
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
          carrier_cents: 14964,
          price_cents: 21635,
          customer_total_cents: 21635,
        },
        _last_write: {
          route: "apply-rate",
          at: "2025-01-22T00:00:00.000Z",
          sha: "abc123",
          canonical_detected: true,
          rate_used_overwritten: true,
        },
      },
    };

    // Paso 2: create-label lee metadata (simula freshMetadata)
    const freshMetadata = { ...metadataAfterApplyRate };
    const freshShippingMeta = (freshMetadata.shipping as Record<string, unknown>) || {};
    const freshRateUsed = (freshShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
    }) || null;

    // Paso 3: create-label agrega label_creation (simula updatedShippingMeta)
    const updatedShippingMeta = {
      ...freshShippingMeta,
      label_creation: {
        status: "created",
        started_at: "2025-01-22T00:01:00.000Z",
        finished_at: "2025-01-22T00:01:05.000Z",
        request_id: "req_123",
      },
      label_url: "https://example.com/label.pdf",
      tracking_number: "TRACK123",
      shipping_status: "label_created",
    };

    // Paso 4: Merge seguro (como en create-label)
    const finalShippingForUpdate: Record<string, unknown> = {
      ...freshShippingMeta,
      ...updatedShippingMeta,
      // Preservar rate_used de freshMetadata si tiene números (más reciente)
      rate_used: freshRateUsed && 
        (freshRateUsed.price_cents != null || freshRateUsed.carrier_cents != null)
        ? freshRateUsed
        : (updatedShippingMeta as Record<string, unknown>).rate_used,
    };

    const mergedMetadata: Record<string, unknown> = {
      ...freshMetadata,
      shipping: finalShippingForUpdate,
    };

    // Paso 5: Normalizar (como en create-label)
    const normalized = normalizeShippingMetadata(mergedMetadata, {
      source: "create-label",
      orderId: "test-order-123",
    });

    const finalMetadata: Record<string, unknown> = {
      ...mergedMetadata,
      ...(normalized.shippingPricing ? { shipping_pricing: normalized.shippingPricing } : {}),
      shipping: normalized.shippingMeta,
    };

    // Paso 6: Validación - rate_used debe persistir con números
    const finalShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsed = finalShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
      customer_total_cents?: number | null;
    };

    // Invariantes: rate_used debe seguir con números después de create-label
    expect(finalRateUsed).toBeTruthy();
    expect(finalRateUsed.price_cents).toBe(21635);
    expect(finalRateUsed.carrier_cents).toBe(14964);
    expect(finalRateUsed.customer_total_cents).toBe(21635);
    
    // Nunca null
    expect(finalRateUsed.price_cents).not.toBeNull();
    expect(finalRateUsed.carrier_cents).not.toBeNull();
    expect(finalRateUsed.customer_total_cents).not.toBeNull();
    
    // label_creation debe estar presente
    expect(finalShippingMeta.label_creation).toBeTruthy();
    expect((finalShippingMeta.label_creation as { status?: string }).status).toBe("created");
  });

  it("reproduce bug: otro writer (webhook/sync-label/requote) no debe borrar rate_used después de apply-rate", async () => {
    // Simula el bug reportado:
    // 1. apply-rate setea rate_used con números
    // 2. Otro writer (ej: webhook/sync-label/requote) ejecuta update con metadata stale donde rate_used viene null
    // 3. Después del segundo update, rate_used debe seguir con números (preservado o rellenado desde shipping_pricing)

    // Paso 1: Estado después de apply-rate (metadata con rate_used lleno)
    const metadataAfterApplyRate: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 15338,
        packaging_cents: 2000,
        margin_cents: 4788,
        total_cents: 22126,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_xyz",
          provider: "skydropx",
          service: "express",
          carrier_cents: 15338,
          price_cents: 22126,
          customer_total_cents: 22126,
        },
        _last_write: {
          route: "apply-rate",
          at: "2025-01-27T00:23:22.000Z",
          sha: "e935144",
          canonical_detected: true,
          rate_used_overwritten: true,
        },
      },
    };

    // Paso 2: Otro writer (ej: webhook) lee metadata (simula freshMetadata)
    const freshMetadata = { ...metadataAfterApplyRate };

    // Paso 3: Otro writer quiere actualizar solo shipment_id (simula updatedShippingMeta)
    // PERO viene con metadata stale donde rate_used es null (BUG)
    const staleMetadata: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 15338,
        packaging_cents: 2000,
        margin_cents: 4788,
        total_cents: 22126,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_xyz",
          provider: "skydropx",
          service: "express",
          carrier_cents: null, // NULL (stale data)
          price_cents: null, // NULL (stale data)
          customer_total_cents: null, // NULL (stale data)
        },
        shipment_id: "shipment_123", // Nuevo campo que el writer quiere agregar
      },
    };

    // Paso 4: Aplicar preserveRateUsed (esto es lo que debe hacer cada writer)
    const finalMetadata = preserveRateUsed(freshMetadata, staleMetadata);

    // Paso 5: Validación - rate_used debe persistir con números
    const finalShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsed = finalShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
      customer_total_cents?: number | null;
    };

    // Invariantes: rate_used debe seguir con números después del segundo update
    expect(finalRateUsed).toBeTruthy();
    expect(finalRateUsed.price_cents).toBe(22126);
    expect(finalRateUsed.carrier_cents).toBe(15338);
    expect(finalRateUsed.customer_total_cents).toBe(22126);
    
    // Nunca null
    expect(finalRateUsed.price_cents).not.toBeNull();
    expect(finalRateUsed.carrier_cents).not.toBeNull();
    expect(finalRateUsed.customer_total_cents).not.toBeNull();
    
    // shipment_id debe estar presente (el nuevo campo que el writer agregó)
    expect(finalShippingMeta.shipment_id).toBe("shipment_123");
  });

  it("reproduce bug real: apply-rate debe actualizar rate_used con nuevo carrier_cents aunque DB tenga valores viejos", async () => {
    // Caso real reportado:
    // - DB tiene rate_used.carrier_cents = 20126 (valor viejo)
    // - apply-rate quiere aplicar nuevo rate con carrier_cents = 15338
    // - shipping_pricing.carrier_cents = 15338 (canonical)
    // - Resultado esperado: rate_used.carrier_cents = 15338 (no 20126, no null)

    // Paso 1: Estado inicial en DB (con valores viejos)
    const freshDbMetadata: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 20126, // Valor viejo
        packaging_cents: 2000,
        margin_cents: 4788,
        total_cents: 26914, // Valor viejo
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_old",
          provider: "skydropx",
          service: "express",
          carrier_cents: 20126, // Valor viejo
          price_cents: 26914, // Valor viejo
          customer_total_cents: 26914,
        },
        _last_write: {
          route: "requote",
          at: "2025-01-27T00:20:00.000Z",
          sha: "abc1234",
        },
      },
    };

    // Paso 2: apply-rate quiere aplicar nuevo rate con carrier_cents = 15338
    const incomingMetadata: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 15338, // Nuevo valor
        packaging_cents: 2000,
        margin_cents: 4788,
        total_cents: 22126, // Nuevo valor
        customer_total_cents: 22126,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_new",
          provider: "skydropx",
          service: "express",
          carrier_cents: 15338, // Nuevo valor explícito
          price_cents: 22126, // Nuevo valor explícito
          customer_total_cents: 22126,
          selection_source: "admin",
        },
        _last_write: {
          route: "apply-rate",
          at: "2025-01-27T00:23:22.000Z",
          sha: "e935144",
          canonical_detected: true,
          rate_used_overwritten: true,
        },
      },
    };

    // Paso 3: Aplicar preserveRateUsed
    const finalMetadata = preserveRateUsed(freshDbMetadata, incomingMetadata);

    // Paso 4: Validación - rate_used debe reflejar los nuevos valores, no los viejos
    const finalShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsed = finalShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
      customer_total_cents?: number | null;
    };
    const finalPricing = finalMetadata.shipping_pricing as {
      carrier_cents?: number | null;
      total_cents?: number | null;
    };

    // Invariantes críticos:
    // 1. rate_used debe reflejar los nuevos valores del rate aplicado
    expect(finalRateUsed.carrier_cents).toBe(15338);
    expect(finalRateUsed.price_cents).toBe(22126);
    expect(finalRateUsed.customer_total_cents).toBe(22126);
    
    // 2. NO debe preservar valores viejos
    expect(finalRateUsed.carrier_cents).not.toBe(20126);
    expect(finalRateUsed.price_cents).not.toBe(26914);
    
    // 3. NO debe quedar null
    expect(finalRateUsed.carrier_cents).not.toBeNull();
    expect(finalRateUsed.price_cents).not.toBeNull();
    
    // 4. rate_used debe coincidir con shipping_pricing (canonical)
    expect(finalRateUsed.carrier_cents).toBe(finalPricing.carrier_cents);
    expect(finalRateUsed.price_cents).toBe(finalPricing.total_cents);
    
    // 5. Otros campos deben preservarse
    expect((finalRateUsed as Record<string, unknown>).external_rate_id).toBe("rate_new");
    expect((finalRateUsed as Record<string, unknown>).provider).toBe("skydropx");
    expect((finalRateUsed as Record<string, unknown>).service).toBe("express");
  });

  it("reproduce bug DB null: metadata con shipping_pricing numerico pero rate_used sin cents debe incluir rate_used", () => {
    // Caso real: metadata tiene shipping_pricing con números pero rate_used no tiene cents
    // o rate_used no existe. ensureRateUsedInMetadata debe forzar que rate_used tenga cents.

    // Paso 1: Metadata con shipping_pricing pero rate_used sin cents (o inexistente)
    const metadataWithoutRateUsedCents: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 15338,
        packaging_cents: 2000,
        margin_cents: 4788,
        total_cents: 22126,
        customer_total_cents: 22126,
      },
      shipping: {
        rate_used: {
          external_rate_id: "rate_xyz",
          provider: "skydropx",
          service: "express",
          // price_cents y carrier_cents NO están presentes o son null
        },
      },
    };

    // Paso 2: Aplicar ensureRateUsedInMetadata (esto es lo que debe hacer cada writer antes de escribir)
    const finalMetadata = ensureRateUsedInMetadata(metadataWithoutRateUsedCents);

    // Paso 3: Validación - rate_used DEBE incluir price_cents y carrier_cents
    const finalShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsed = finalShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
      customer_total_cents?: number | null;
    };
    const finalPricing = finalMetadata.shipping_pricing as {
      carrier_cents?: number | null;
      total_cents?: number | null;
    };

    // Invariantes críticos:
    // 1. rate_used DEBE tener price_cents y carrier_cents (no null, no undefined)
    expect(finalRateUsed).toBeTruthy();
    expect(finalRateUsed.price_cents).toBe(22126);
    expect(finalRateUsed.carrier_cents).toBe(15338);
    expect(finalRateUsed.customer_total_cents).toBe(22126);
    
    // 2. NO debe quedar null
    expect(finalRateUsed.price_cents).not.toBeNull();
    expect(finalRateUsed.carrier_cents).not.toBeNull();
    expect(finalRateUsed.customer_total_cents).not.toBeNull();
    
    // 3. rate_used debe coincidir con shipping_pricing (canonical)
    expect(finalRateUsed.carrier_cents).toBe(finalPricing.carrier_cents);
    expect(finalRateUsed.price_cents).toBe(finalPricing.total_cents);
    
    // 4. Otros campos deben preservarse
    expect((finalRateUsed as Record<string, unknown>).external_rate_id).toBe("rate_xyz");
    expect((finalRateUsed as Record<string, unknown>).provider).toBe("skydropx");
    expect((finalRateUsed as Record<string, unknown>).service).toBe("express");
  });

  it("reproduce bug DB null: metadata sin rate_used debe crear rate_used desde shipping_pricing", () => {
    // Caso extremo: metadata tiene shipping_pricing pero rate_used no existe en absoluto

    const metadataWithoutRateUsed: Record<string, unknown> = {
      shipping_pricing: {
        carrier_cents: 15338,
        packaging_cents: 2000,
        margin_cents: 4788,
        total_cents: 22126,
        customer_total_cents: 22126,
      },
      shipping: {
        // rate_used no existe
        provider: "skydropx",
        service: "express",
      },
    };

    // Aplicar ensureRateUsedInMetadata
    const finalMetadata = ensureRateUsedInMetadata(metadataWithoutRateUsed);

    // Validación - rate_used DEBE ser creado con valores desde shipping_pricing
    const finalShippingMeta = finalMetadata.shipping as Record<string, unknown>;
    const finalRateUsed = finalShippingMeta.rate_used as {
      carrier_cents?: number | null;
      price_cents?: number | null;
      customer_total_cents?: number | null;
    };

    expect(finalRateUsed).toBeTruthy();
    expect(finalRateUsed.price_cents).toBe(22126);
    expect(finalRateUsed.carrier_cents).toBe(15338);
    expect(finalRateUsed.customer_total_cents).toBe(22126);
    
    // NO debe quedar null
    expect(finalRateUsed.price_cents).not.toBeNull();
    expect(finalRateUsed.carrier_cents).not.toBeNull();
  });
});
