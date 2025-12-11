export const LOYALTY_MIN_POINTS_FOR_DISCOUNT = 1000;
export const LOYALTY_POINTS_PER_MXN = 1;
export const LOYALTY_DISCOUNT_PERCENT = 5;

export type LoyaltyTier = {
  id: "inicio" | "frecuente" | "profesional" | "elite";
  name: string;
  minPoints: number;
  maxPoints?: number;
  color: "slate" | "blue" | "amber" | "purple";
  headline: string;
  benefits: string[];
};

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

export function getTierForPoints(points: number): LoyaltyTier {
  const safePoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;

  for (const tier of LOYALTY_TIERS) {
    const withinMin = safePoints >= tier.minPoints;
    const withinMax = tier.maxPoints === undefined ? true : safePoints <= tier.maxPoints;
    if (withinMin && withinMax) {
      return tier;
    }
  }

  return LOYALTY_TIERS[0];
}

export function getNextTierInfo(points: number): {
  nextTier: LoyaltyTier | null;
  pointsToNext: number | null;
} {
  const currentTier = getTierForPoints(points);
  const currentIndex = LOYALTY_TIERS.findIndex((t) => t.id === currentTier.id);

  const nextTier = LOYALTY_TIERS[currentIndex + 1] ?? null;
  if (!nextTier) {
    return { nextTier: null, pointsToNext: null };
  }

  const pointsToNext = Math.max(0, nextTier.minPoints - Math.max(0, Number.isFinite(points) ? points : 0));
  return { nextTier, pointsToNext };
}

export function hasEnoughPointsForDiscount(points: number): boolean {
  const safePoints = Number.isFinite(points) ? points : 0;
  return safePoints >= LOYALTY_MIN_POINTS_FOR_DISCOUNT;
}
