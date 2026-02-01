/**
 * Calcula las dimensiones del paquete basándose en las dimensiones de los productos
 * Estrategia simple: tomar máximos de length/width/height entre productos
 * @param items Array de items con product_id
 * @param productsMap Mapa de product_id -> dimensiones (desde DB)
 * @param defaultDimensions Dimensiones por defecto si un producto no tiene dimensiones
 * @returns Objeto con length_cm, width_cm, height_cm, source, missing_fields_count
 */
export async function estimatePackageDimensions(
  items: Array<{ product_id: string | null }>,
  productsMap: Map<
    string,
    {
      length_cm: number | null;
      width_cm: number | null;
      height_cm: number | null;
    }
  >,
  defaultDimensions: {
    length_cm: number;
    width_cm: number;
    height_cm: number;
  } = {
    length_cm: 25,
    width_cm: 20,
    height_cm: 15,
  },
): Promise<{
  length_cm: number;
  width_cm: number;
  height_cm: number;
  source: "products" | "fallback" | "mixed";
  missing_fields_count: number;
}> {
  if (!items || items.length === 0) {
    return {
      length_cm: defaultDimensions.length_cm,
      width_cm: defaultDimensions.width_cm,
      height_cm: defaultDimensions.height_cm,
      source: "fallback",
      missing_fields_count: 0,
    };
  }

  let maxLengthCm = 0;
  let maxWidthCm = 0;
  let maxHeightCm = 0;
  let missingFieldsCount = 0;
  let hasProductDimensions = false;
  let hasFallbacks = false;

  for (const item of items) {
    if (!item.product_id) {
      missingFieldsCount++;
      hasFallbacks = true;
      continue;
    }

    const productDims = productsMap.get(item.product_id);
    if (
      productDims &&
      productDims.length_cm !== null &&
      productDims.length_cm > 0 &&
      productDims.width_cm !== null &&
      productDims.width_cm > 0 &&
      productDims.height_cm !== null &&
      productDims.height_cm > 0
    ) {
      // Producto tiene dimensiones válidas
      maxLengthCm = Math.max(maxLengthCm, productDims.length_cm);
      maxWidthCm = Math.max(maxWidthCm, productDims.width_cm);
      maxHeightCm = Math.max(maxHeightCm, productDims.height_cm);
      hasProductDimensions = true;
    } else {
      // Producto sin dimensiones
      missingFieldsCount++;
      hasFallbacks = true;
    }
  }

  // Si no se encontraron dimensiones válidas, usar defaults
  if (maxLengthCm === 0 || maxWidthCm === 0 || maxHeightCm === 0) {
    return {
      length_cm: defaultDimensions.length_cm,
      width_cm: defaultDimensions.width_cm,
      height_cm: defaultDimensions.height_cm,
      source: "fallback",
      missing_fields_count: missingFieldsCount,
    };
  }

  // Determinar source
  let source: "products" | "fallback" | "mixed";
  if (hasProductDimensions && !hasFallbacks) {
    source = "products";
  } else if (!hasProductDimensions && hasFallbacks) {
    source = "fallback";
  } else {
    source = "mixed";
  }

  return {
    length_cm: maxLengthCm,
    width_cm: maxWidthCm,
    height_cm: maxHeightCm,
    source,
    missing_fields_count: missingFieldsCount,
  };
}
