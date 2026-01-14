/**
 * Helper para validar si un producto puede agregarse al carrito
 * basado en si requiere variantes/colores y si están seleccionados
 */

import { requiresVariants, getVariantConfig } from "@/lib/products/variants";
import { hasColorOptions } from "@/lib/products/colors";

type Product = {
  title: string;
  product_slug: string;
};

type SelectionState = {
  variantDetail: string | null;
  selectedColor: string | null;
};

type GuardResult = {
  canAddToCart: boolean;
  missingReason?: string;
};

/**
 * Verifica si un producto puede agregarse al carrito
 * @param product - Información del producto
 * @param selectionState - Estado de selecciones (variantes/colores)
 * @returns Resultado con canAddToCart y mensaje si falta algo
 */
export function usePdpAddToCartGuard(
  product: Product,
  selectionState: SelectionState,
): GuardResult {
  const needsVariants = requiresVariants(product.title);
  const needsColor = hasColorOptions(product.product_slug, product.title);

  // Si no requiere selecciones, puede agregar
  if (!needsVariants && !needsColor) {
    return { canAddToCart: true };
  }

  // Validar variantes si son requeridas
  if (needsVariants && !selectionState.variantDetail) {
    const config = getVariantConfig(product.title);
    let message = "Selecciona las opciones requeridas antes de agregar este producto a tu pedido.";
    if (config) {
      if (config.variantType === "arco-niti-redondo" || config.variantType === "arco-niti-rectangular") {
        message = "Selecciona medida y arcada antes de agregar este arco a tu pedido.";
      } else if (config.variantType === "tubos-malla") {
        message = "Selecciona la pieza antes de agregar este producto a tu pedido.";
      } else if (config.variantType === "brackets-carton") {
        message = "Selecciona el sistema antes de agregar este producto a tu pedido.";
      }
    }
    return { canAddToCart: false, missingReason: message };
  }

  // Validar color si es requerido
  if (needsColor && !selectionState.selectedColor) {
    return {
      canAddToCart: false,
      missingReason: "Selecciona un color antes de agregar este producto a tu pedido.",
    };
  }

  // Todas las validaciones pasaron
  return { canAddToCart: true };
}

/**
 * Verifica si un producto requiere selecciones obligatorias (sin estado)
 * Útil para deshabilitar botones antes de que el usuario seleccione
 */
export function requiresSelections(product: Product): boolean {
  return requiresVariants(product.title) || hasColorOptions(product.product_slug, product.title);
}
