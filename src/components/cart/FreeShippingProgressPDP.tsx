"use client";

import { useCartStore } from "@/lib/store/cartStore";
import FreeShippingProgress from "./FreeShippingProgress";

type Props = {
  /**
   * Precio del producto actual en centavos
   */
  productPriceCents?: number;
  /**
   * Cantidad seleccionada del producto actual (default: 1)
   */
  quantity?: number;
};

/**
 * Versión del componente FreeShippingProgress para PDP
 * Calcula el subtotal incluyendo el producto actual + carrito existente
 */
export default function FreeShippingProgressPDP({
  productPriceCents = 0,
  quantity = 1,
}: Props) {
  const cartItems = useCartStore((state) => state.cartItems);
  
  // Calcular subtotal del carrito en centavos
  const cartSubtotalCents = cartItems.reduce((sum, item) => {
    const priceCents = typeof item.price_cents === "number" && item.price_cents > 0
      ? item.price_cents
      : Math.round(item.price * 100);
    return sum + priceCents * item.qty;
  }, 0);

  // Incluir el producto actual con la cantidad seleccionada
  const productSubtotalCents = productPriceCents * quantity;
  
  // Subtotal total: carrito + producto actual
  const totalSubtotalCents = cartSubtotalCents + productSubtotalCents;

  return <FreeShippingProgress subtotalCents={totalSubtotalCents} className="mt-3" />;
}

