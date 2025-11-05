// src/components/cart/CartSticky.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { formatMXN } from "@/lib/utils/money";

export default function CartSticky() {
  const pathname = usePathname();
  const cartItems = useCartStore((s) => s.cartItems);
  const count = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Ocultar en rutas de checkout
  if (pathname?.startsWith("/checkout")) {
    return null;
  }

  // No mostrar si el carrito está vacío
  if (count === 0) {
    return null;
  }

  return (
    <>
      {/* Móvil: barra inferior */}
      <Link
        href="/carrito"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-black text-white px-4 py-3 flex items-center justify-between shadow-lg"
      >
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5" />
          <span className="font-medium">
            {count} {count === 1 ? "producto" : "productos"}
          </span>
        </div>
        <span className="font-bold text-lg">{formatMXN(total)}</span>
      </Link>

      {/* Desktop: burbuja flotante abajo-derecha */}
      <Link
        href="/carrito"
        className="hidden md:flex fixed bottom-6 right-6 z-50 bg-black text-white px-6 py-4 rounded-full shadow-xl hover:bg-black/90 transition-all items-center gap-3"
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          {count > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-black text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
              {count}
            </span>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-300">Total</span>
          <span className="font-bold text-lg">{formatMXN(total)}</span>
        </div>
      </Link>
    </>
  );
}
