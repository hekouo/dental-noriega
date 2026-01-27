/**
 * Helper centralizado para logging PRE/POST de writers de metadata.shipping
 * 
 * Formato consistente para identificar qué writer está causando problemas
 */

type RateUsedSnapshot = {
  price_cents?: number | null;
  carrier_cents?: number | null;
  customer_total_cents?: number | null;
  raw_price_cents?: number | null;
  raw_carrier_cents?: number | null;
};

type MetadataSnapshot = {
  rate_used?: RateUsedSnapshot | null;
  shipping_pricing?: {
    total_cents?: number | null;
    carrier_cents?: number | null;
  } | null;
  _last_write?: {
    route?: string;
    sha?: string;
    at?: string;
  } | null;
};

type PreWriteLog = {
  routeName: string;
  orderId: string;
  now: string;
  sha: string;
  freshDb: {
    updated_at?: string | null;
    rate_used: MetadataSnapshot["rate_used"];
    shipping_pricing: MetadataSnapshot["shipping_pricing"];
    _last_write: {
      route?: string | null;
      sha?: string | null;
      at?: string | null;
    } | null | undefined;
  };
  incoming: {
    rate_used: MetadataSnapshot["rate_used"];
    shipping_pricing: MetadataSnapshot["shipping_pricing"];
  };
};

type PostWriteLog = {
  routeName: string;
  orderId: string;
  now: string;
  sha: string;
  postWrite: {
    updated_at?: string | null;
    rate_used: MetadataSnapshot["rate_used"];
    shipping_pricing: MetadataSnapshot["shipping_pricing"];
    _last_write: {
      route?: string | null;
      sha?: string | null;
      at?: string | null;
    } | null | undefined;
  };
  discrepancy?: {
    detected: boolean;
    reason: string;
  };
};

/**
 * Extrae snapshot de rate_used y shipping_pricing desde metadata
 */
function extractMetadataSnapshot(metadata: Record<string, unknown> | null | undefined): MetadataSnapshot {
  if (!metadata) {
    return {};
  }

  const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
  const rateUsed = (shippingMeta.rate_used as Record<string, unknown> | null) || null;
  const shippingPricing = (metadata.shipping_pricing as MetadataSnapshot["shipping_pricing"]) || null;
  const lastWrite = (shippingMeta._last_write as MetadataSnapshot["_last_write"]) || null;

  return {
    rate_used: rateUsed ? {
      price_cents: rateUsed.price_cents ?? null,
      carrier_cents: rateUsed.carrier_cents ?? null,
      customer_total_cents: rateUsed.customer_total_cents ?? null,
      // Agregar valores raw para debugging (sin fallbacks)
      raw_price_cents: typeof rateUsed.price_cents === "number" ? rateUsed.price_cents : null,
      raw_carrier_cents: typeof rateUsed.carrier_cents === "number" ? rateUsed.carrier_cents : null,
    } as RateUsedSnapshot : null,
    shipping_pricing: shippingPricing ? {
      total_cents: shippingPricing.total_cents ?? null,
      carrier_cents: shippingPricing.carrier_cents ?? null,
    } : null,
    _last_write: lastWrite ? {
      route: lastWrite.route ?? undefined,
      sha: lastWrite.sha ?? undefined,
      at: lastWrite.at ?? undefined,
    } : undefined,
  };
}

/**
 * Obtiene SHA del commit actual
 */
function getCurrentSha(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || "unknown";
}

/**
 * Log PRE-WRITE: antes de hacer update a orders.metadata
 */
export function logPreWrite(
  routeName: string,
  orderId: string,
  freshDbMetadata: Record<string, unknown> | null | undefined,
  freshDbUpdatedAt: string | null | undefined,
  incomingMetadata: Record<string, unknown>,
): void {
  const now = new Date().toISOString();
  const sha = getCurrentSha();
  
  const freshDb = extractMetadataSnapshot(freshDbMetadata);
  const incoming = extractMetadataSnapshot(incomingMetadata);
  const dbBeforeWritePaths = extractDbAfterWritePaths(freshDbMetadata);

  const log: PreWriteLog & {
    db_before_write_paths?: {
      db_ru_price: string | null;
      db_ru_carrier: string | null;
      db_sp_total: string | null;
      db_sp_carrier: string | null;
    };
  } = {
    routeName,
    orderId,
    now,
    sha,
    freshDb: {
      updated_at: freshDbUpdatedAt ?? null,
      rate_used: freshDb.rate_used,
      shipping_pricing: freshDb.shipping_pricing,
      _last_write: freshDb._last_write,
    },
    incoming: {
      rate_used: incoming.rate_used,
      shipping_pricing: incoming.shipping_pricing,
    },
    db_before_write_paths: dbBeforeWritePaths,
  };

  console.log(`[${routeName}] PRE-WRITE:`, JSON.stringify(log, null, 2));
}

/**
 * Extrae valores desde paths SQL reales (metadata #>> '{shipping,rate_used,price_cents}')
 * IMPORTANTE: Esta función debe recibir metadata que viene de DB real (reread post-write),
 * NO del payload local antes de escribir.
 */
function extractDbAfterWritePaths(metadata: Record<string, unknown> | null | undefined): {
  db_ru_price: string | null;
  db_ru_carrier: string | null;
  db_sp_total: string | null;
  db_sp_carrier: string | null;
} {
  if (!metadata) {
    return {
      db_ru_price: null,
      db_ru_carrier: null,
      db_sp_total: null,
      db_sp_carrier: null,
    };
  }

  // Extraer usando paths SQL: metadata #>> '{shipping,rate_used,price_cents}'
  const shippingMeta = (metadata.shipping as Record<string, unknown>) || {};
  const rateUsed = (shippingMeta.rate_used as Record<string, unknown>) || null;
  const shippingPricing = (metadata.shipping_pricing as Record<string, unknown>) || null;

  // Extraer valores RAW (sin fallbacks, tal como están en DB)
  const dbRuPrice = rateUsed?.price_cents != null ? String(rateUsed.price_cents) : null;
  const dbRuCarrier = rateUsed?.carrier_cents != null ? String(rateUsed.carrier_cents) : null;
  const dbSpTotal = shippingPricing?.total_cents != null ? String(shippingPricing.total_cents) : null;
  const dbSpCarrier = shippingPricing?.carrier_cents != null ? String(shippingPricing.carrier_cents) : null;

  return {
    db_ru_price: dbRuPrice,
    db_ru_carrier: dbRuCarrier,
    db_sp_total: dbSpTotal,
    db_sp_carrier: dbSpCarrier,
  };
}

/**
 * Log POST-WRITE: después de hacer update, detecta discrepancias
 * IMPORTANTE: postWriteMetadata debe venir de DB real (reread post-write), NO del payload local
 */
export function logPostWrite(
  routeName: string,
  orderId: string,
  postWriteMetadata: Record<string, unknown> | null | undefined,
  postWriteUpdatedAt: string | null | undefined,
): void {
  const now = new Date().toISOString();
  const sha = getCurrentSha();
  
  const postWrite = extractMetadataSnapshot(postWriteMetadata);
  const dbAfterWritePaths = extractDbAfterWritePaths(postWriteMetadata);

  // Detectar discrepancia: shipping_pricing tiene números pero rate_used queda null
  const hasCanonicalNumbers = Boolean(
    (postWrite.shipping_pricing?.total_cents != null && postWrite.shipping_pricing.total_cents > 0) ||
    (postWrite.shipping_pricing?.carrier_cents != null && postWrite.shipping_pricing.carrier_cents > 0)
  );

  const rateUsedIsNull = !postWrite.rate_used || (
    (postWrite.rate_used.price_cents == null || postWrite.rate_used.price_cents === null) &&
    (postWrite.rate_used.carrier_cents == null || postWrite.rate_used.carrier_cents === null)
  );

  // Detectar discrepancia usando valores reales de DB (reread post-write)
  const dbHasCanonicalNumbers = Boolean(
    (dbAfterWritePaths.db_sp_total != null) ||
    (dbAfterWritePaths.db_sp_carrier != null)
  );

  const dbRateUsedIsNull = !dbAfterWritePaths.db_ru_price && !dbAfterWritePaths.db_ru_carrier;

  const discrepancy = (hasCanonicalNumbers && rateUsedIsNull) || (dbHasCanonicalNumbers && dbRateUsedIsNull) ? {
    detected: true,
    reason: "shipping_pricing tiene números pero rate_used quedó null en DB (confirmado con reread post-write)",
  } : undefined;

  const log: PostWriteLog & {
    db_after_write_paths?: {
      db_ru_price: string | null;
      db_ru_carrier: string | null;
      db_sp_total: string | null;
      db_sp_carrier: string | null;
    };
  } = {
    routeName,
    orderId,
    now,
    sha,
    postWrite: {
      updated_at: postWriteUpdatedAt ?? null,
      rate_used: postWrite.rate_used,
      shipping_pricing: postWrite.shipping_pricing,
      _last_write: postWrite._last_write,
    },
    db_after_write_paths: dbAfterWritePaths,
    discrepancy,
  };

  console.log(`[${routeName}] POST-WRITE:`, JSON.stringify(log, null, 2));

  // Si hay discrepancia, loggear error con valores reales de DB
  if (discrepancy) {
    console.error(`[${routeName}] DISCREPANCIA DETECTADA:`, discrepancy.reason, {
      orderId,
      routeName,
      db_after_write_paths: dbAfterWritePaths,
      shipping_pricing: postWrite.shipping_pricing,
      rate_used: postWrite.rate_used,
    });
  }
}
