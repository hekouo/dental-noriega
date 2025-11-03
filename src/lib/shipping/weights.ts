// src/lib/shipping/weights.ts
/**
 * Cálculo de pesos para envío
 */

/**
 * Obtiene el peso en kg de un producto por su slug
 * @param slug Slug del producto
 * @returns Peso en kg (default: 0.2 kg)
 */
export function itemKg(_slug: string): number {
  // Por ahora todos los productos pesan 0.2 kg por defecto
  // En el futuro se puede expandir con una tabla de pesos específicos
  return 0.2;
}

/**
 * Calcula el peso total del carrito
 * @param items Array de items con id (o slug si está disponible)
 * @returns Peso total en kg (mínimo 0.1 kg)
 */
export function cartKg(items: Array<{ id: string; slug?: string }>): number {
  if (!items || items.length === 0) return 0.1;

  const total = items.reduce((sum, item) => {
    const slug = item.slug || item.id;
    return sum + itemKg(slug);
  }, 0);

  // Mínimo 0.1 kg
  return Math.max(0.1, total);
}
