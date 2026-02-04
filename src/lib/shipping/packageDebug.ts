export type PackageItemDebug = {
  product_id?: string | null;
  sku?: string | null;
  title?: string | null;
  qty: number;
  unit_weight_g: number | null;
  line_weight_g: number | null;
  source: "product" | "fallback" | "unknown";
};

/** Caja estándar del negocio: 25×20×15 cm. Usar por defecto cuando no hay override. */
export const STANDARD_BOX_DIMS_CM = {
  length: 25,
  width: 20,
  height: 15,
} as const;

export type DimsSource = "override" | "standard_box" | "products";

export type PackageDebug = {
  orderId: string;
  routeName: "create-label" | string;
  computed_at: string;
  dims_cm: { length: number; width: number; height: number };
  dims_source?: DimsSource;
  volumetric_divisor?: number | null;
  rounding_policy?: string;
  mass_weight_g: number;
  tare_weight_g: number;
  mass_plus_tare_g: number;
  volumetric_weight_kg: number;
  billable_weight_kg: number;
  weight_sent_to_skydropx_kg: number;
  items: PackageItemDebug[];
  warnings?: string[];
};

export type PackageDebugProduct = {
  sku?: string | null;
  title?: string | null;
  slug?: string | null;
  shipping_weight_g?: number | null;
  shipping_length_cm?: number | null;
  shipping_width_cm?: number | null;
  shipping_height_cm?: number | null;
  shipping_profile?: string | null;
};

export type PackageDebugOrderItem = {
  product_id: string | null;
  qty: number;
  title?: string | null;
};

export type ShippingPackageMetaSnapshot = {
  mass_weight_g?: number | null;
  tare_weight_g?: number | null;
  volumetric_weight_kg?: number | null;
  billable_weight_kg?: number | null;
  volumetric_factor?: number | null;
  dims_cm?: {
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
  } | null;
} | null;

type BuildPackageDebugOptions = {
  orderId: string;
  routeName: "create-label" | string;
  items: PackageDebugOrderItem[];
  products: Map<string, PackageDebugProduct>;
  fallbackItemWeightG: number;
  shippingPackageMeta: ShippingPackageMetaSnapshot;
  dimsCmUsed: { length_cm: number; width_cm: number; height_cm: number };
  dims_source?: DimsSource;
  roundingPolicy: string;
  weightSentToSkydropxKg: number;
  volumetricDivisorDefault?: number;
  now?: Date;
};

const DEFAULT_TARE_WEIGHT_G = 1200;
const DEFAULT_VOLUMETRIC_DIVISOR = 5000;

export function buildPackageDebug(options: BuildPackageDebugOptions): PackageDebug {
  const warnings = new Set<string>();

  const volumetricDivisor =
    options.shippingPackageMeta?.volumetric_factor ??
    options.volumetricDivisorDefault ??
    DEFAULT_VOLUMETRIC_DIVISOR;

  const resolvedDims = {
    length:
      options.shippingPackageMeta?.dims_cm?.length_cm ??
      options.dimsCmUsed.length_cm,
    width:
      options.shippingPackageMeta?.dims_cm?.width_cm ??
      options.dimsCmUsed.width_cm,
    height:
      options.shippingPackageMeta?.dims_cm?.height_cm ??
      options.dimsCmUsed.height_cm,
  };

  const itemsDebug = options.items.map<PackageItemDebug>((item) => {
    const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
    const product = item.product_id ? options.products.get(item.product_id) : undefined;
    const sku = product?.sku ?? null;
    const title = product?.title ?? item.title ?? null;

    let unitWeight: number | null = null;
    let source: PackageItemDebug["source"] = "unknown";

    if (product && typeof product.shipping_weight_g === "number" && product.shipping_weight_g > 0) {
      unitWeight = product.shipping_weight_g;
      source = "product";
    } else if (product) {
      unitWeight = options.fallbackItemWeightG;
      source = "fallback";
      warnings.add(
        `missing_weight_for_product:${product.sku || product.title || item.product_id || "unknown"}`,
      );
    } else {
      unitWeight = options.fallbackItemWeightG;
      warnings.add(`missing_product_for_item:${title || item.product_id || "unknown"}`);
    }

    const lineWeight = unitWeight != null ? unitWeight * qty : null;

    return {
      product_id: item.product_id,
      sku,
      title,
      qty,
      unit_weight_g: unitWeight,
      line_weight_g: lineWeight,
      source,
    };
  });

  if (itemsDebug.length === 0) {
    warnings.add("no_order_items_found");
  }

  if (!options.shippingPackageMeta) {
    warnings.add("missing_shipping_package_meta");
  }

  const itemsWeightG = itemsDebug.reduce((sum, item) => sum + (item.line_weight_g ?? 0), 0);
  const tareWeight =
    typeof options.shippingPackageMeta?.tare_weight_g === "number"
      ? options.shippingPackageMeta.tare_weight_g
      : DEFAULT_TARE_WEIGHT_G;
  const massPlusTare =
    typeof options.shippingPackageMeta?.mass_weight_g === "number"
      ? options.shippingPackageMeta.mass_weight_g
      : itemsWeightG + tareWeight;
  const massWeight = Math.max(0, massPlusTare - tareWeight);

  const volumetricWeight =
    typeof options.shippingPackageMeta?.volumetric_weight_kg === "number"
      ? options.shippingPackageMeta.volumetric_weight_kg
      : Number(
          ((resolvedDims.length * resolvedDims.width * resolvedDims.height) / volumetricDivisor).toFixed(3),
        );

  const billableWeight =
    typeof options.shippingPackageMeta?.billable_weight_kg === "number"
      ? options.shippingPackageMeta.billable_weight_kg
      : Number(Math.max(massPlusTare / 1000, volumetricWeight).toFixed(3));

  const computedAtIso = (options.now ?? new Date()).toISOString();

  const packageDebug: PackageDebug = {
    orderId: options.orderId,
    routeName: options.routeName,
    computed_at: computedAtIso,
    dims_cm: {
      length: Number(resolvedDims.length),
      width: Number(resolvedDims.width),
      height: Number(resolvedDims.height),
    },
    dims_source: options.dims_source,
    volumetric_divisor: volumetricDivisor,
    rounding_policy: options.roundingPolicy,
    mass_weight_g: Math.round(massWeight),
    tare_weight_g: Math.round(tareWeight),
    mass_plus_tare_g: Math.round(massPlusTare),
    volumetric_weight_kg: Number(volumetricWeight),
    billable_weight_kg: Number(billableWeight),
    weight_sent_to_skydropx_kg: Number(options.weightSentToSkydropxKg.toFixed(3)),
    items: itemsDebug,
    warnings: warnings.size > 0 ? Array.from(warnings) : undefined,
  };

  return packageDebug;
}
