/**
 * Utilidades para cálculos de puntos de lealtad
 */

import { LOYALTY_POINTS_PER_MXN } from "./config";

/**
 * Estima los puntos que se ganarían con un precio dado
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
 * Basado en que 1,000 puntos = 5% de descuento
 * Aproximación: 1 punto ≈ 0.01 MXN (considerando un pedido promedio de $2,000 MXN)
 * @param points Cantidad de puntos
 * @returns Valor aproximado en MXN (redondeado hacia abajo)
 */
export function estimateFutureValueFromPoints(points: number): number {
  if (!points || points <= 0) return 0;

  // Aproximación conservadora: 
  // Si 1,000 puntos dan 5% de descuento en un pedido de $2,000 MXN = $100 MXN de descuento
  // Entonces 1,000 puntos ≈ $100 MXN de valor
  // Por lo tanto, 1 punto ≈ $0.10 MXN
  // Pero para ser más conservador, usamos 0.05 MXN por punto
  const valuePerPoint = 0.05; // $0.05 MXN por punto
  const value = points * valuePerPoint;
  return Math.floor(value);
}
