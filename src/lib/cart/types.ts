// src/lib/cart/types.ts

// Item de carrito tal como lo usas hoy (precio en PESOS).
export type CartItem = {
  id: string;
  title: string;
  price: number; // pesos (ej. 105.00). Para cobrar, usa toCents(price).
  image?: string;
  imageResolved?: string;
  qty: number; // entero >= 1
  sectionSlug?: string;
  slug?: string;
};

export type CartState = {
  items: CartItem[];
};

/* ===========================
   Helpers seguros para Checkout
   =========================== */

// Convierte pesos a centavos (evita decimales malditos).
export function toCents(price: number): number {
  // Redondeo bancario simple
  return Math.round((price ?? 0) * 100);
}

// Total del carrito en centavos, útil para guardar en DB.
export function cartTotalCents(items: CartItem[]): number {
  return items.reduce(
    (acc, it) => acc + toCents(it.price) * Math.max(1, it.qty | 0),
    0,
  );
}

// Asegura que cada item tenga qty válida y price numérico. Úsalo antes de pagar/guardar.
export function sanitizeCart(items: CartItem[]): CartItem[] {
  return items
    .filter((it) => !!it && typeof it.id === "string" && it.id.length > 0)
    .map((it) => ({
      ...it,
      qty: Math.max(1, (it.qty ?? 1) | 0),
      price: Number.isFinite(it.price) ? it.price : 0,
    }));
}

// Tipo de línea para el checkout MVP/real (nombre, precio en CENTAVOS, cantidad).
export type CheckoutLineItem = {
  name: string;
  unitAmountCents: number;
  quantity: number;
};

// Mapea tu CartItem al formato que usan las APIs del checkout.
export function mapToCheckoutItems(items: CartItem[]): CheckoutLineItem[] {
  return sanitizeCart(items).map((it) => ({
    name: it.title,
    unitAmountCents: toCents(it.price),
    quantity: it.qty,
  }));
}
