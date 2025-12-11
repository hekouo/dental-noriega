/**
 * Utilidades para calcular puntos de lealtad y valores estimados
 */

import { LOYALTY_POINTS_PER_MXN } from "./config";

/**
 * Estima cuántos puntos se ganan con un precio dado en centavos
 * @param priceCents Precio del producto en centavos
 * @returns Número de puntos estimados (redondeado hacia abajo)
 */
export function estimatePointsForPriceCents(priceCents: number): number {
  if (!priceCents || priceCents <= 0) return 0;
  const priceMXN = priceCents / 100;
  const rawPoints = priceMXN * LOYALTY_POINTS_PER_MXN;
  return Math.floor(rawPoints);
}

/**
 * Estima el valor futuro aproximado en MXN de una cantidad de puntos
 * Basado en que 1 punto ≈ 0.01 MXN (aproximación conservadora)
 * @param points Cantidad de puntos
 * @returns Valor aproximado en MXN (redondeado hacia abajo)
 */
export function estimateFutureValueFromPoints(points: number): number {
  if (!points || points <= 0) return 0;
  // Aproximación: 1 punto ≈ 0.01 MXN
  // Esto es una referencia visual, no un cálculo exacto de canje
  const value = points * 0.01;
  return Math.floor(value);
}

