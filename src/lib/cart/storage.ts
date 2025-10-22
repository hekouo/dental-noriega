// src/lib/cart/storage.ts

const KEY = "dn.cart.v1";

export function loadCart() {
  if (typeof window === "undefined") return { items: [] };
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"items":[]}');
  } catch {
    return { items: [] };
  }
}

export function saveCart(state: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}
