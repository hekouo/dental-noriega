export function formatCurrency(amount: number): string {
  // Protección contra NaN e infinito
  if (!Number.isFinite(amount) || amount < 0) {
    return "Precio a consultar";
  }
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

export function calculateShipping(subtotal: number): number {
  // Envío gratis sobre $2000
  return subtotal >= 2000 ? 0 : 150;
}

export function calculatePointsEarned(total: number): number {
  // 1 punto por cada $10 MXN
  return Math.floor(total / 10);
}

export function calculatePointsValue(points: number): number {
  // 100 puntos = $10 MXN
  return (points / 100) * 10;
}

export function calculateMaxRedeemablePoints(
  total: number,
  balance: number,
): number {
  // Máximo 50% del total puede ser cubierto con puntos
  const maxDiscount = total * 0.5;
  const maxPoints = Math.floor((maxDiscount / 10) * 100);
  return Math.min(maxPoints, balance);
}
