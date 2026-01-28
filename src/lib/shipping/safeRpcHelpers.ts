/**
 * Helpers seguros para llamar RPCs de orders que actualizan metadata.shipping
 * 
 * Estos helpers previenen que se pise rate_used.*_cents cuando hay canonical pricing.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { ensureRateUsedInMetadata } from "./normalizeShippingMetadata";

type SafeShippingPath = 
  | ['label_creation']
  | ['tracking']
  | ['tracking_number']
  | ['address']
  | ['address_override']
  | ['status']
  | ['shipment_id']
  | ['package']
  | ['package_final'];

/**
 * Wrapper seguro para orders_patch_shipping_metadata
 * 
 * BLOQUEA:
 * - field_path = [] (patch de {shipping} completo)
 * - field_path = ['rate_used'] (patch de rate_used completo)
 * 
 * PERMITE solo subpaths específicos listados en SafeShippingPath
 */
export async function safePatchShippingMetadata(
  supabase: SupabaseClient,
  orderId: string,
  fieldPath: SafeShippingPath,
  fieldValue: Record<string, unknown>,
): Promise<{ ok: true; metadata: Record<string, unknown> } | { ok: false; error: string }> {
  // TypeScript garantiza que SafeShippingPath no está vacío y no incluye 'rate_used'
  // Validación en runtime solo para arrays no tipados que puedan pasar
  if (!fieldPath || (fieldPath as unknown[]).length === 0) {
    return {
      ok: false,
      error: "fieldPath no puede estar vacío. Use subpaths específicos como ['label_creation']",
    };
  }

  // Validar que no sea patch de rate_used (aunque TypeScript ya lo previene)
  const firstPath = fieldPath[0] as string;
  if (firstPath === 'rate_used') {
    return {
      ok: false,
      error: "No se permite patch de {shipping,rate_used} completo. Use .update() con preserveRateUsed",
    };
  }

  // Leer metadata actual para aplicar guardrails
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return {
      ok: false,
      error: fetchError?.message || "Order not found",
    };
  }

  const currentMetadata = (order.metadata as Record<string, unknown>) || {};

  // Aplicar ensureRateUsedInMetadata ANTES de construir fieldValue
  // Esto garantiza que si hay shipping_pricing, rate_used tiene números
  const ensuredMetadata = ensureRateUsedInMetadata(currentMetadata);

  // Construir metadata simulado para validar que el patch no rompa rate_used
  const simulatedMetadata = {
    ...ensuredMetadata,
    shipping: {
      ...(ensuredMetadata.shipping as Record<string, unknown> || {}),
      [fieldPath[fieldPath.length - 1]]: fieldValue,
    },
  };

  // Validar que el patch simulado no rompa rate_used
  const finalMetadata = ensureRateUsedInMetadata(simulatedMetadata);
  const shippingMeta = (finalMetadata.shipping as Record<string, unknown>) || {};
  const rateUsed = (shippingMeta.rate_used as Record<string, unknown>) || null;
  const shippingPricing = finalMetadata.shipping_pricing as {
    total_cents?: number | null;
    carrier_cents?: number | null;
  } | null | undefined;

  // Guardrail: Si shipping_pricing tiene números, rate_used DEBE tener números
  if (shippingPricing && (shippingPricing.total_cents != null || shippingPricing.carrier_cents != null)) {
    if (!rateUsed || rateUsed.price_cents == null || rateUsed.carrier_cents == null) {
      console.error(`[safePatchShippingMetadata] GUARDRAIL: shipping_pricing tiene números pero rate_used quedaría null después del patch. orderId=${orderId}, fieldPath=${JSON.stringify(fieldPath)}`);
      // En desarrollo, throw; en producción, loggear y rellenar
      if (process.env.NODE_ENV !== "production") {
        return {
          ok: false,
          error: "Patch resultaría en rate_used.*_cents = null cuando hay canonical pricing",
        };
      }
    }
  }

  // Llamar RPC con logging
  console.log(`[safePatchShippingMetadata] Calling RPC: orderId=${orderId}, fieldPath=${JSON.stringify(fieldPath)}, fieldValueKeys=${Object.keys(fieldValue).join(',')}`);

  const { data: updatedMetadata, error: rpcError } = await supabase.rpc(
    "orders_patch_shipping_metadata",
    {
      order_id: orderId,
      field_path: fieldPath,
      field_value: fieldValue,
    },
  );

  if (rpcError) {
    console.error(`[safePatchShippingMetadata] RPC error:`, rpcError);
    return {
      ok: false,
      error: rpcError.message,
    };
  }

  return {
    ok: true,
    metadata: (updatedMetadata as Record<string, unknown>) || {},
  };
}

/**
 * Wrapper seguro para orders_set_shipping_label_creation
 */
export async function safeSetShippingLabelCreation(
  supabase: SupabaseClient,
  orderId: string,
  labelCreation: Record<string, unknown>,
): Promise<{ ok: true; metadata: Record<string, unknown> } | { ok: false; error: string }> {
  // Leer metadata actual para aplicar guardrails
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("metadata")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return {
      ok: false,
      error: fetchError?.message || "Order not found",
    };
  }

  const currentMetadata = (order.metadata as Record<string, unknown>) || {};
  const ensuredMetadata = ensureRateUsedInMetadata(currentMetadata);

  // Validar que el patch no rompa rate_used
  const simulatedMetadata = {
    ...ensuredMetadata,
    shipping: {
      ...(ensuredMetadata.shipping as Record<string, unknown> || {}),
      label_creation: labelCreation,
    },
  };

  const finalMetadata = ensureRateUsedInMetadata(simulatedMetadata);
  const shippingMeta = (finalMetadata.shipping as Record<string, unknown>) || {};
  const rateUsed = (shippingMeta.rate_used as Record<string, unknown>) || null;
  const shippingPricing = finalMetadata.shipping_pricing as {
    total_cents?: number | null;
    carrier_cents?: number | null;
  } | null | undefined;

  // Guardrail
  if (shippingPricing && (shippingPricing.total_cents != null || shippingPricing.carrier_cents != null)) {
    if (!rateUsed || rateUsed.price_cents == null || rateUsed.carrier_cents == null) {
      console.error(`[safeSetShippingLabelCreation] GUARDRAIL: shipping_pricing tiene números pero rate_used quedaría null. orderId=${orderId}`);
      if (process.env.NODE_ENV !== "production") {
        return {
          ok: false,
          error: "Patch resultaría en rate_used.*_cents = null cuando hay canonical pricing",
        };
      }
    }
  }

  console.log(`[safeSetShippingLabelCreation] Calling RPC: orderId=${orderId}, labelCreationKeys=${Object.keys(labelCreation).join(',')}`);

  const { data: updatedMetadata, error: rpcError } = await supabase.rpc(
    "orders_set_shipping_label_creation",
    {
      order_id: orderId,
      label_creation: labelCreation,
    },
  );

  if (rpcError) {
    console.error(`[safeSetShippingLabelCreation] RPC error:`, rpcError);
    return {
      ok: false,
      error: rpcError.message,
    };
  }

  return {
    ok: true,
    metadata: (updatedMetadata as Record<string, unknown>) || {},
  };
}
