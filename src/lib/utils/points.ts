// src/lib/utils/points.ts

export function getPointsRate(): number {
  const n = Number(process.env.NEXT_PUBLIC_POINTS_RATE ?? "100");
  return Number.isFinite(n) && n > 0 ? n : 100;
}

export function pointsFor(priceMXN: number, qty = 1): number {
  const rate = getPointsRate();
  const total = Math.max(0, (priceMXN || 0) * Math.max(1, qty));
  return Math.floor(total / rate);
}

