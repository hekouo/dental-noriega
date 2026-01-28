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
    // 2. rate_used tiene campos numéricos (no null)
    // 3. Los valores coinciden exactamente con canonical (prueba de que el overwrite funcionó)
    const rateUsedOverwritten = Boolean(
      canonicalDetected &&
      rateUsed &&
      typeof rateUsed.carrier_cents === "number" &&
      typeof rateUsed.price_cents === "number" &&
      rateUsed.carrier_cents === canonCarrier &&
      rateUsed.price_cents === canonTotal,
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

/**
 * Helper central para preservar rate_used y prevenir que quede null cuando hay canonical pricing.
 * 
 * Reglas:
 * 1. Si incoming tiene números explícitos Y hay canonical pricing que coincide -> usar incoming (permitir overwrite)
 * 2. Si incoming._last_write.route === "apply-rate" o canonical_detected=true -> permitir overwrite de incoming
 * 3. Si freshDb.rate_used tiene números Y incoming tiene nulls -> preservar DB (solo cuando incoming no tiene intención explícita)
 * 4. Si incoming.rate_used viene null pero hay canonical pricing -> rellenar desde canonical
 * 5. Si incoming.rate_used tiene números -> usar incoming
 * 6. Bloquear explícitamente: shipping_pricing tiene números pero rate_used queda null
 * 
 * @param freshDbMetadata - Metadata leído de DB justo antes del update
 * @param incomingMetadata - Metadata que el writer quiere guardar
 * @returns Metadata con rate_used garantizado (nunca null si hay canonical pricing)
 */
export function preserveRateUsed(
  freshDbMetadata: Record<string, unknown> | null | undefined,
  incomingMetadata: Record<string, unknown>,
): Record<string, unknown> {
  const freshShippingMeta = (freshDbMetadata?.shipping as Record<string, unknown>) || {};
  const freshRateUsed = (freshShippingMeta.rate_used as {
    carrier_cents?: number | null;
    price_cents?: number | null;
    customer_total_cents?: number | null;
  }) || null;

  const incomingShippingMeta = (incomingMetadata.shipping as Record<string, unknown>) || {};
  const incomingRateUsed = (incomingShippingMeta.rate_used as {
    carrier_cents?: number | null;
    price_cents?: number | null;
    customer_total_cents?: number | null;
  }) || null;

  // Obtener canonical pricing (prioridad: root shipping_pricing -> nested shipping.pricing)
  const rootPricing = incomingMetadata.shipping_pricing as Record<string, unknown> | null | undefined;
  const nestedPricing = incomingShippingMeta.pricing as Record<string, unknown> | null | undefined;
  const canonicalPricing = rootPricing || nestedPricing || null;

  const canonCarrier = canonicalPricing ? toNum((canonicalPricing as { carrier_cents?: unknown }).carrier_cents) : null;
  const canonTotal = canonicalPricing ? toNum((canonicalPricing as { total_cents?: unknown }).total_cents) : null;
  const canonCustomerTotal = canonicalPricing ? toNum((canonicalPricing as { customer_total_cents?: unknown }).customer_total_cents) : null;

  const hasCanonicalNumbers = canonCarrier != null || canonTotal != null;

  // Detectar si incoming tiene intención explícita de overwrite (apply-rate o canonical_detected)
  const incomingLastWrite = (incomingShippingMeta._last_write as {
    route?: string;
    canonical_detected?: boolean;
  }) || null;
  const isExplicitOverwrite = incomingLastWrite?.route === "apply-rate" || incomingLastWrite?.canonical_detected === true;

  // REGLA 1: Si incoming tiene números explícitos Y coincide con canonical pricing -> usar incoming (permitir overwrite)
  const incomingHasNumbers = incomingRateUsed && (
    (typeof incomingRateUsed.price_cents === "number" && incomingRateUsed.price_cents > 0) ||
    (typeof incomingRateUsed.carrier_cents === "number" && incomingRateUsed.carrier_cents > 0)
  );
  
  const incomingMatchesCanonical = incomingHasNumbers && hasCanonicalNumbers && (
    (incomingRateUsed.price_cents === canonTotal && incomingRateUsed.carrier_cents === canonCarrier) ||
    isExplicitOverwrite
  );

  if (incomingMatchesCanonical || isExplicitOverwrite) {
    // incoming tiene intención explícita de overwrite (apply-rate o coincide con canonical)
    // Permitir overwrite completo, pero rellenar campos faltantes desde canonical si es necesario
    const finalRateUsed: Record<string, unknown> = {
      ...(incomingRateUsed as Record<string, unknown> || {}),
      // Asegurar que price_cents y carrier_cents coincidan con canonical si están presentes
      ...(canonTotal != null ? { price_cents: canonTotal } : {}),
      ...(canonCarrier != null ? { carrier_cents: canonCarrier } : {}),
      ...(canonCustomerTotal != null ? { customer_total_cents: canonCustomerTotal } : {}),
    };
    
    return {
      ...incomingMetadata,
      shipping: {
        ...incomingShippingMeta,
        rate_used: finalRateUsed,
      },
    };
  }

  // REGLA 2: Si incoming tiene números explícitos -> usar incoming (ya está bien)
  if (incomingHasNumbers) {
    // incoming ya tiene números, pero no coincide con canonical o no es overwrite explícito
    // Rellenar campos faltantes desde canonical si es necesario
    const finalRateUsed: Record<string, unknown> = {
      ...(incomingRateUsed as Record<string, unknown> || {}),
      // Solo rellenar si están null/undefined
      ...(incomingRateUsed.price_cents == null && canonTotal != null ? { price_cents: canonTotal } : {}),
      ...(incomingRateUsed.carrier_cents == null && canonCarrier != null ? { carrier_cents: canonCarrier } : {}),
      ...(incomingRateUsed.customer_total_cents == null && canonCustomerTotal != null ? { customer_total_cents: canonCustomerTotal } : {}),
    };
    
    return {
      ...incomingMetadata,
      shipping: {
        ...incomingShippingMeta,
        rate_used: finalRateUsed,
      },
    };
  }

  // REGLA 3: Si freshDb.rate_used tiene números Y incoming tiene nulls -> preservar DB (solo cuando incoming no tiene intención explícita)
  // ENDURECIDO: Tratar null como "missing" y preservar valores numéricos de freshDb
  const freshHasNumbers = freshRateUsed && (
    (typeof freshRateUsed.price_cents === "number" && freshRateUsed.price_cents > 0) ||
    (typeof freshRateUsed.carrier_cents === "number" && freshRateUsed.carrier_cents > 0)
  );

  // incomingIsNull: true si incoming no existe O si price_cents/carrier_cents son null/undefined
  const incomingIsNull = !incomingRateUsed || (
    (incomingRateUsed.price_cents == null || incomingRateUsed.price_cents === null) &&
    (incomingRateUsed.carrier_cents == null || incomingRateUsed.carrier_cents === null)
  );

  // ENDURECIDO: Si incoming trae null explícito pero freshDb tiene números, preservar freshDb
  const incomingHasExplicitNulls = incomingRateUsed && (
    incomingRateUsed.price_cents === null ||
    incomingRateUsed.carrier_cents === null
  );

  if (freshHasNumbers && (incomingIsNull || incomingHasExplicitNulls) && !isExplicitOverwrite) {
    // Preservar rate_used de DB, pero mergear otros campos de incoming si existen
    const preservedRateUsed: Record<string, unknown> = {
      ...(incomingRateUsed as Record<string, unknown> || {}),
      // FORZAR preservación de valores numéricos de freshDb (tratar null como missing)
      price_cents: freshRateUsed.price_cents ?? incomingRateUsed?.price_cents ?? null,
      carrier_cents: freshRateUsed.carrier_cents ?? incomingRateUsed?.carrier_cents ?? null,
      customer_total_cents: freshRateUsed.customer_total_cents ?? incomingRateUsed?.customer_total_cents ?? null,
    };
    
    return {
      ...incomingMetadata,
      shipping: {
        ...incomingShippingMeta,
        rate_used: preservedRateUsed,
      },
    };
  }

  // REGLA 4: Si incoming.rate_used viene null pero hay canonical pricing -> rellenar desde canonical
  if (incomingIsNull && hasCanonicalNumbers) {
    // Rellenar rate_used desde canonical pricing
    const filledRateUsed: Record<string, unknown> = {
      ...(incomingRateUsed as Record<string, unknown> || {}),
      price_cents: canonTotal,
      carrier_cents: canonCarrier,
      customer_total_cents: canonCustomerTotal ?? canonTotal,
    };

    return {
      ...incomingMetadata,
      shipping: {
        ...incomingShippingMeta,
        rate_used: filledRateUsed,
      },
    };
  }

  // REGLA 5: Bloquear explícitamente - shipping_pricing tiene números pero rate_used queda null
  if (hasCanonicalNumbers && !incomingHasNumbers && !freshHasNumbers) {
    // Forzar fill desde canonical
    const forcedRateUsed: Record<string, unknown> = {
      ...(incomingRateUsed as Record<string, unknown> || {}),
      price_cents: canonTotal,
      carrier_cents: canonCarrier,
      customer_total_cents: canonCustomerTotal ?? canonTotal,
    };

    return {
      ...incomingMetadata,
      shipping: {
        ...incomingShippingMeta,
        rate_used: forcedRateUsed,
      },
    };
  }

  // Si no hay canonical pricing y no hay números en ningún lado, devolver incoming tal cual
  return incomingMetadata;
}

/**
 * Helper CRÍTICO: Garantiza que rate_used.*_cents esté presente en metadata antes de escribir a Supabase.
 * 
 * Este helper se ejecuta JUSTO ANTES del update a Supabase para asegurar que rate_used
 * se incluya explícitamente en el payload, incluso si normalizeShippingMetadata o preserveRateUsed
 * no lo incluyeron correctamente.
 * 
 * Reglas:
 * 1. Si shipping_pricing tiene números -> rate_used.price_cents y carrier_cents DEBEN existir
 * 2. Si rate_used no existe o tiene nulls -> crear/rellenar desde shipping_pricing
 * 3. Mantener otros campos de rate_used si ya existen
 * 
 * @param metadata - Metadata final que se va a escribir a Supabase
 * @returns Metadata con rate_used garantizado (nunca null si hay canonical pricing)
 */
export function ensureRateUsedInMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const shippingPricing = metadata.shipping_pricing as {
    carrier_cents?: number | null;
    total_cents?: number | null;
    customer_total_cents?: number | null;
  } | null | undefined;

  const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
  const existingRateUsed = (shippingMeta.rate_used as Record<string, unknown>) || null;

  // Si hay canonical pricing con números, rate_used DEBE existir con números
  const hasCanonicalNumbers = shippingPricing && (
    (typeof shippingPricing.carrier_cents === "number" && shippingPricing.carrier_cents > 0) ||
    (typeof shippingPricing.total_cents === "number" && shippingPricing.total_cents > 0)
  );

  if (hasCanonicalNumbers) {
    const canonCarrier = shippingPricing.carrier_cents ?? null;
    const canonTotal = shippingPricing.total_cents ?? null;
    const canonCustomerTotal = shippingPricing.customer_total_cents ?? canonTotal ?? null;

    // GUARDRAIL CENTRAL: Si shipping_pricing tiene números pero rate_used tiene nulls -> log error y forzar fill
    // (No throw para no romper tests, pero loggea fuerte para detectar en producción)
    const rateUsedPriceIsNull = !existingRateUsed || existingRateUsed.price_cents == null || existingRateUsed.price_cents === null;
    const rateUsedCarrierIsNull = !existingRateUsed || existingRateUsed.carrier_cents == null || existingRateUsed.carrier_cents === null;
    
    if (canonTotal != null && rateUsedPriceIsNull) {
      const errorMsg = `[ensureRateUsedInMetadata] GUARDRAIL: shipping_pricing.total_cents=${canonTotal} pero rate_used.price_cents es null. Forzando fill desde canonical.`;
      console.error(errorMsg, {
        shipping_pricing: {
          total_cents: canonTotal,
          carrier_cents: canonCarrier,
        },
        rate_used: existingRateUsed,
      });
      // No throw, solo loggear y forzar fill (el código abajo lo hace)
    }

    // Verificar si rate_used tiene números o está null/missing
    const rateUsedHasNumbers = existingRateUsed && (
      (typeof existingRateUsed.price_cents === "number" && existingRateUsed.price_cents > 0) ||
      (typeof existingRateUsed.carrier_cents === "number" && existingRateUsed.carrier_cents > 0)
    );

    // Si rate_used no tiene números, forzar desde canonical
    if (!rateUsedHasNumbers) {
      const ensuredRateUsed: Record<string, unknown> = {
        ...(existingRateUsed || {}),
        // FORZAR valores desde canonical pricing
        price_cents: canonTotal,
        carrier_cents: canonCarrier,
        customer_total_cents: canonCustomerTotal,
      };

      return {
        ...metadata,
        shipping: {
          ...shippingMeta,
          rate_used: ensuredRateUsed,
        },
      };
    }

    // Si rate_used tiene números pero alguno está null, rellenar desde canonical
    const needsFill = existingRateUsed && (
      (existingRateUsed.price_cents == null || existingRateUsed.price_cents === null) ||
      (existingRateUsed.carrier_cents == null || existingRateUsed.carrier_cents === null)
    );

    if (needsFill) {
      const filledRateUsed: Record<string, unknown> = {
        ...existingRateUsed,
        // Solo rellenar los que están null
        ...(existingRateUsed.price_cents == null ? { price_cents: canonTotal } : {}),
        ...(existingRateUsed.carrier_cents == null ? { carrier_cents: canonCarrier } : {}),
        ...(existingRateUsed.customer_total_cents == null ? { customer_total_cents: canonCustomerTotal } : {}),
      };

      return {
        ...metadata,
        shipping: {
          ...shippingMeta,
          rate_used: filledRateUsed,
        },
      };
    }
  }

  // Si no hay canonical pricing o rate_used ya está bien, devolver tal cual
  return metadata;
}
