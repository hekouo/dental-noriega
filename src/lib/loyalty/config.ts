/**
 * Configuración centralizada del sistema de lealtad
 * Define los niveles/tiers y helpers para calcular el estado del usuario
 */

/**
 * Puntos ganados por cada 1 MXN gastado
 */
export const LOYALTY_POINTS_PER_MXN = 1;

/**
 * Porcentaje de descuento que se puede activar con puntos (5%)
 */
export const LOYALTY_DISCOUNT_PERCENT = 5;

/**
 * Puntos mínimos requeridos para activar el descuento del 5%
 */
export const LOYALTY_MIN_POINTS_FOR_DISCOUNT = 1000;

/**
 * Tipo que representa un nivel/tier del programa de lealtad
 */
export type LoyaltyTier = {
  id: "inicio" | "frecuente" | "profesional" | "elite";
  name: string;
  minPoints: number;
  maxPoints?: number;
  color: "slate" | "blue" | "amber" | "purple";
  headline: string;
  benefits: string[];
};

/**
 * Array de niveles del programa de lealtad, ordenados de menor a mayor
 */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    id: "inicio",
    name: "Nivel 1 · Inicio",
    minPoints: 0,
    maxPoints: 999,
    color: "slate",
    headline: "Empiezas a acumular puntos en cada pedido.",
    benefits: [
      "1 punto por cada $1 MXN en compras.",
      "Acceso a promociones generales.",
    ],
  },
  {
    id: "frecuente",
    name: "Nivel 2 · Cliente frecuente",
    minPoints: 1000,
    maxPoints: 2999,
    color: "blue",
    headline: "Ya desbloqueaste tu primer beneficio.",
    benefits: [
      "1 punto por cada $1 MXN en compras.",
      "Puedes activar 5 % de descuento usando 1,000 puntos en un pedido.",
    ],
  },
  {
    id: "profesional",
    name: "Nivel 3 · Profesional",
    minPoints: 3000,
    maxPoints: 6999,
    color: "amber",
    headline: "Estás entre nuestros mejores clientes.",
    benefits: [
      "Todo lo del nivel Cliente frecuente.",
      "Te avisamos primero cuando haya ofertas en brackets y guantes.",
    ],
  },
  {
    id: "elite",
    name: "Nivel 4 · Élite",
    minPoints: 7000,
    color: "purple",
    headline: "Nivel máximo de lealtad.",
    benefits: [
      "Todos los beneficios anteriores.",
      "Puedes pedir cotizaciones especiales por volumen vía WhatsApp.",
    ],
  },
];

/**
 * Obtiene el tier correspondiente a una cantidad de puntos
 * @param points - Cantidad de puntos del usuario
 * @returns El tier que corresponde a esos puntos
 */
export function getTierForPoints(points: number): LoyaltyTier {
  // Normalizar puntos negativos a 0
  const normalizedPoints = Math.max(0, points);

  // Buscar el tier que corresponde a estos puntos
  // Recorrer de mayor a menor para encontrar el primero que cumpla
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    const tier = LOYALTY_TIERS[i];
    
    // Si el tier tiene maxPoints, verificar rango
    if (tier.maxPoints !== undefined) {
      if (normalizedPoints >= tier.minPoints && normalizedPoints <= tier.maxPoints) {
        return tier;
      }
    } else {
      // Si no tiene maxPoints, es el último nivel (elite)
      if (normalizedPoints >= tier.minPoints) {
        return tier;
      }
    }
  }

  // Fallback: si algo raro pasa, devolver el primer tier
  return LOYALTY_TIERS[0];
}

/**
 * Obtiene información sobre el siguiente tier y puntos faltantes
 * @param points - Cantidad de puntos actuales del usuario
 * @returns Objeto con el siguiente tier (o null si está en el último) y puntos faltantes
 */
export function getNextTierInfo(points: number): {
  nextTier: LoyaltyTier | null;
  pointsToNext: number | null;
} {
  const currentTier = getTierForPoints(points);
  const normalizedPoints = Math.max(0, points);

  // Encontrar el índice del tier actual
  const currentIndex = LOYALTY_TIERS.findIndex((tier) => tier.id === currentTier.id);

  // Si es el último tier (elite), no hay siguiente
  if (currentIndex === LOYALTY_TIERS.length - 1) {
    return { nextTier: null, pointsToNext: null };
  }

  // Obtener el siguiente tier
  const nextTier = LOYALTY_TIERS[currentIndex + 1];
  const pointsToNext = Math.max(0, nextTier.minPoints - normalizedPoints);

  return { nextTier, pointsToNext };
}

/**
 * Verifica si el usuario tiene suficientes puntos para activar el descuento del 5%
 * @param points - Cantidad de puntos del usuario
 * @returns true si tiene al menos LOYALTY_MIN_POINTS_FOR_DISCOUNT puntos
 */
export function hasEnoughPointsForDiscount(points: number): boolean {
  return points >= LOYALTY_MIN_POINTS_FOR_DISCOUNT;
}
