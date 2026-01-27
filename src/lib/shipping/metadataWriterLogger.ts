/**
 * Helper centralizado para logging PRE/POST de writers de metadata.shipping
 * 
 * Formato consistente para identificar qué writer está causando problemas
 */

type MetadataSnapshot = {
  rate_used?: {
    price_cents?: number | null;
    carrier_cents?: number | null;
    customer_total_cents?: number | null;
  } | null;
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
  const rateUsed = (shippingMeta.rate_used as MetadataSnapshot["rate_used"]) || null;
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
    } : null,
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

  const log: PreWriteLog = {
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
  };

  console.log(`[${routeName}] PRE-WRITE:`, JSON.stringify(log, null, 2));
}

/**
 * Log POST-WRITE: después de hacer update, detecta discrepancias
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

  // Detectar discrepancia: shipping_pricing tiene números pero rate_used queda null
  const hasCanonicalNumbers = Boolean(
    (postWrite.shipping_pricing?.total_cents != null && postWrite.shipping_pricing.total_cents > 0) ||
    (postWrite.shipping_pricing?.carrier_cents != null && postWrite.shipping_pricing.carrier_cents > 0)
  );

  const rateUsedIsNull = !postWrite.rate_used || (
    (postWrite.rate_used.price_cents == null || postWrite.rate_used.price_cents === null) &&
    (postWrite.rate_used.carrier_cents == null || postWrite.rate_used.carrier_cents === null)
  );

  const discrepancy = hasCanonicalNumbers && rateUsedIsNull ? {
    detected: true,
    reason: "shipping_pricing tiene números pero rate_used quedó null",
  } : undefined;

  const log: PostWriteLog = {
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
    discrepancy,
  };

  console.log(`[${routeName}] POST-WRITE:`, JSON.stringify(log, null, 2));

  // Si hay discrepancia, loggear error
  if (discrepancy) {
    console.error(`[${routeName}] DISCREPANCIA DETECTADA:`, discrepancy.reason, {
      orderId,
      shipping_pricing: postWrite.shipping_pricing,
      rate_used: postWrite.rate_used,
    });
  }
}
