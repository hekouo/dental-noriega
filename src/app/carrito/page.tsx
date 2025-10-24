"use client";

import { useCartStore, selectCartItems } from "@/lib/store/cartStore";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatCurrency } from "@/lib/utils/currency";
import { Trash2, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, startTransition } from "react";
import { supabase } from "@/lib/supabase/client";
import { ROUTES } from "@/lib/routes";

export default function CarritoPage() {
  const cartItems = useCartStore(selectCartItems);
  const setCartQty = useCartStore((state) => state.setCartQty);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);
  const ingestFromCart = useCheckoutStore((state) => state.ingestFromCart);
  const busy = useRef(false);
  const [user, setUser] = useState<unknown>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: any } }) => setUser(user));
    
    // Prefetch checkout page for faster navigation
    router.prefetch("/checkout");
  }, [router]);

  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );

  const handleContinueToCheckout = useCallback(() => {
    if (busy.current || !cartItems?.length) return;
    busy.current = true;

    // 1) Inyecta al checkout
    ingestFromCart(cartItems, true);

    // 2) Limpia carrito
    clearCart();

    // 3) Navega sin bloquear la UI
    startTransition(() => {
      router.push("/checkout");
      busy.current = false;
    });
  }, [cartItems, ingestFromCart, clearCart, router]);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Tu carrito está vacío</h1>
          <p className="text-gray-600 mb-6">
            Agrega productos para comenzar tu compra
          </p>
          <Link href={ROUTES.destacados()} className="btn btn-primary">
            <span>Ver Productos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow p-6 flex gap-4"
            >
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">ID: {item.id}</p>
                <p className="text-primary-600 font-bold mt-2">
                  {formatCurrency(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setCartQty(item.id, item.variantId, item.qty - 1)
                  }
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Disminuir cantidad"
                >
                  <Minus size={20} />
                </button>
                <span className="w-12 text-center font-medium">{item.qty}</span>
                <button
                  onClick={() =>
                    setCartQty(item.id, item.variantId, item.qty + 1)
                  }
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={20} />
                </button>
              </div>

              <button
                onClick={() => removeFromCart(item.id, item.variantId)}
                className="text-red-600 hover:bg-red-50 p-2 rounded"
                aria-label="Eliminar producto"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(cartSubtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Envío</span>
                <span>Se calcula en el checkout</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total estimado</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
            </div>

            {user ? (
              <button
                onClick={handleContinueToCheckout}
                disabled={busy.current}
                className="w-full btn btn-primary block text-center"
                aria-busy={busy.current}
              >
                <span>{busy.current ? "Procesando..." : "Continuar al Checkout"}</span>
              </button>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Inicia sesión para continuar
                </p>
                <Link
                  href={ROUTES.cuenta()}
                  className="w-full btn btn-primary block text-center"
                >
                  <span>Iniciar Sesión</span>
                </Link>
              </div>
            )}

            <Link
              href={ROUTES.destacados()}
              className="block text-center text-primary-600 hover:underline mt-4"
            >
              <span>Seguir comprando</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
