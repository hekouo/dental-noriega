"use client";

import { useCartStore } from "@/lib/store/cartStore";
import FreeShippingProgress from "./FreeShippingProgress";

/**
 * Versión del componente FreeShippingProgress para PDP
 * Obtiene el subtotal del carrito automáticamente
 */
export default function FreeShippingProgressPDP() {
  const cartItems = useCartStore((state) => state.cartItems);
  
  // Calcular subtotal en centavos desde el carrito
  const subtotalCents = cartItems.reduce((sum, item) => {
    const priceCents = typeof item.price_cents === "number" && item.price_cents > 0
      ? item.price_cents
      : Math.round(item.price * 100);
    return sum + priceCents * item.qty;
  }, 0);

  return <FreeShippingProgress subtotalCents={subtotalCents} className="mt-3" />;
}

