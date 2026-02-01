/**
 * Calcula el paquete completo para envío Skydropx:
 * - Peso masa con tare fijo 1200g
 * - Dimensiones (productos o fallback por shipping_profile)
 * - Peso volumétrico (L*W*H/5000)
 * - Peso facturable = max(masa, volumétrico)
 */

/** Dimensiones fallback por shipping_profile (spec) */
const DIMENSION_FALLBACK_BY_PROFILE: Record<
  string,
  { length_cm: number; width_cm: number; height_cm: number }
> = {
  SMALL_BOX: { length_cm: 15, width_cm: 10, height_cm: 8 },
  BOX_S: { length_cm: 15, width_cm: 10, height_cm: 8 },
  MEDIUM_BOX: { length_cm: 25, width_cm: 20, height_cm: 15 },
  BOX_M: { length_cm: 25, width_cm: 20, height_cm: 15 },
  ENVELOPE: { length_cm: 24, width_cm: 16, height_cm: 2 },
  CUSTOM: { length_cm: 25, width_cm: 20, height_cm: 15 },
};

const DEFAULT_DIMS = { length_cm: 25, width_cm: 20, height_cm: 15 };
const TARE_WEIGHT_G = 1200;
const VOLUMETRIC_FACTOR = 5000;

export type ProductShippingData = {
  shipping_weight_g: number | null;
  shipping_length_cm: number | null;
  shipping_width_cm: number | null;
  shipping_height_cm: number | null;
  shipping_profile: string | null;
};

export type ShippingPackageResult = {
  mass_weight_g: number;
  tare_weight_g: number;
  missing_weight_fields_count: number;
  dims_cm: { length_cm: number; width_cm: number; height_cm: number };
  dims_source: "products" | "fallback" | "mixed";
  profile_used: string | null;
  volumetric_weight_kg: number;
  billable_weight_kg: number;
  volumetric_factor: number;
  /** Para compatibilidad: peso usado para Skydropx (billable_weight_kg) */
  weight_g: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
};

/**
 * Calcula el paquete completo para envío
 * A) mass_weight_g = tare (1200) + sum(item.shipping_weight_g * qty)
 * B) Dimensiones: max de productos o fallback por shipping_profile
 * C) volumetric_weight_kg = (L*W*H)/5000, billable_weight_kg = max(mass/1000, volumetric)
 */
export function computeShippingPackage(
  items: Array<{ product_id: string | null; qty: number }>,
  productsMap: Map<string, ProductShippingData>,
  defaultItemWeightG: number = 100,
): ShippingPackageResult {
  const itemsWithProduct = items.filter((i) => i.product_id);

  // A) Mass weight: tare + sum(item.shipping_weight_g * qty)
  let itemsWeightG = 0;
  let missingWeightFieldsCount = 0;

  for (const item of items) {
    const qty = item.qty || 1;
    if (!item.product_id) {
      itemsWeightG += defaultItemWeightG * qty;
      missingWeightFieldsCount += qty;
      continue;
    }
    const product = productsMap.get(item.product_id);
    const weightG =
      product?.shipping_weight_g != null && product.shipping_weight_g > 0
        ? product.shipping_weight_g
        : defaultItemWeightG;
    if (weightG === defaultItemWeightG && product) {
      missingWeightFieldsCount += qty;
    }
    itemsWeightG += weightG * qty;
  }

  const mass_weight_g = TARE_WEIGHT_G + itemsWeightG;

  // B) Dimensions: max from products or fallback by shipping_profile
  let maxLength = 0;
  let maxWidth = 0;
  let maxHeight = 0;
  let hasProductDims = false;
  let hasFallback = false;
  let profileUsed: string | null = null;

  for (const item of itemsWithProduct) {
    if (!item.product_id) continue;
    const product = productsMap.get(item.product_id);
    if (
      product &&
      product.shipping_length_cm != null &&
      product.shipping_length_cm > 0 &&
      product.shipping_width_cm != null &&
      product.shipping_width_cm > 0 &&
      product.shipping_height_cm != null &&
      product.shipping_height_cm > 0
    ) {
      maxLength = Math.max(maxLength, product.shipping_length_cm);
      maxWidth = Math.max(maxWidth, product.shipping_width_cm);
      maxHeight = Math.max(maxHeight, product.shipping_height_cm);
      hasProductDims = true;
    } else {
      hasFallback = true;
      // Usar profile del producto para fallback
      const profile = product?.shipping_profile?.trim() || "CUSTOM";
      const fallbackDims =
        DIMENSION_FALLBACK_BY_PROFILE[profile] || DIMENSION_FALLBACK_BY_PROFILE.CUSTOM;
      if (!profileUsed) profileUsed = profile;
      maxLength = Math.max(maxLength, fallbackDims.length_cm);
      maxWidth = Math.max(maxWidth, fallbackDims.width_cm);
      maxHeight = Math.max(maxHeight, fallbackDims.height_cm);
    }
  }

  let dims_cm: { length_cm: number; width_cm: number; height_cm: number };
  let dims_source: "products" | "fallback" | "mixed";

  if (maxLength > 0 && maxWidth > 0 && maxHeight > 0) {
    dims_cm = { length_cm: maxLength, width_cm: maxWidth, height_cm: maxHeight };
    dims_source =
      hasProductDims && !hasFallback
        ? "products"
        : !hasProductDims && hasFallback
          ? "fallback"
          : "mixed";
  } else {
    dims_cm = DEFAULT_DIMS;
    dims_source = "fallback";
    profileUsed = "CUSTOM";
  }

  // C) Volumetric and billable weight
  const volumetric_weight_kg =
    (dims_cm.length_cm * dims_cm.width_cm * dims_cm.height_cm) / VOLUMETRIC_FACTOR;
  const mass_weight_kg = mass_weight_g / 1000;
  const billable_weight_kg = Math.max(mass_weight_kg, volumetric_weight_kg);

  return {
    mass_weight_g,
    tare_weight_g: TARE_WEIGHT_G,
    missing_weight_fields_count: missingWeightFieldsCount,
    dims_cm,
    dims_source,
    profile_used: profileUsed,
    volumetric_weight_kg,
    billable_weight_kg,
    volumetric_factor: VOLUMETRIC_FACTOR,
    weight_g: Math.round(billable_weight_kg * 1000),
    length_cm: dims_cm.length_cm,
    width_cm: dims_cm.width_cm,
    height_cm: dims_cm.height_cm,
  };
}
