export function parsePriceToNumber(raw: string | number): number {
  if (typeof raw === "number") return raw;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function formatMXN(n: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount < 0) {
    return "Precio a consultar";
  }
  return `$${amount.toFixed(2)} MXN`;
}

export function calculatePointsValue(amount: number): number {
  return Math.floor(amount * 0.01); // 1 punto por cada peso
}
