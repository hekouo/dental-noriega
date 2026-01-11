/**
 * Calcula el peso estimado del paquete sumando los pesos de los productos
 * @param items Array de items con product_id y qty
 * @param productsMap Mapa de product_id -> shipping_weight_g (desde DB)
 * @param defaultItemWeightG Peso por defecto si un producto no tiene peso (default: 100g)
 * @returns Objeto con weight_g, source, fallback_used_count
 */
export async function estimatePackageWeight(
  items: Array<{ product_id: string | null; qty: number }>,
  productsMap: Map<string, number | null>,
  defaultItemWeightG: number = 100,
): Promise<{
  weight_g: number;
  source: "products" | "fallback" | "mixed";
  fallback_used_count: number;
}> {
  if (!items || items.length === 0) {
    return {
      weight_g: defaultItemWeightG,
      source: "fallback",
      fallback_used_count: 0,
    };
  }

  let totalWeightG = 0;
  let fallbackUsedCount = 0;
  let hasProductWeights = false;
  let hasFallbacks = false;

  for (const item of items) {
    const qty = item.qty || 1;
    let itemWeightG: number;

    if (item.product_id) {
      const productWeightG = productsMap.get(item.product_id);
      if (productWeightG !== undefined && productWeightG !== null && productWeightG > 0) {
        itemWeightG = productWeightG;
        hasProductWeights = true;
      } else {
        itemWeightG = defaultItemWeightG;
        fallbackUsedCount += qty;
        hasFallbacks = true;
      }
    } else {
      // Si no hay product_id, usar fallback
      itemWeightG = defaultItemWeightG;
      fallbackUsedCount += qty;
      hasFallbacks = true;
    }

    totalWeightG += itemWeightG * qty;
  }

  // Determinar source
  let source: "products" | "fallback" | "mixed";
  if (hasProductWeights && !hasFallbacks) {
    source = "products";
  } else if (!hasProductWeights && hasFallbacks) {
    source = "fallback";
  } else {
    source = "mixed";
  }

  return {
    weight_g: totalWeightG,
    source,
    fallback_used_count: fallbackUsedCount,
  };
}
