"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCartStore, selectCartCore, selectCartOps } from "@/lib/store/cartStore";

export default function CheckoutIndex() {
  const { items, checkoutMode, overrideItems } = useCartStore(selectCartCore);
  const { updateQty, removeItem, setCheckoutMode, setOverrideItems, addItem } =
    useCartStore(selectCartOps);

  const visibleItems = checkoutMode === 'buy-now' && overrideItems?.length
    ? overrideItems
    : items;

  // Acciones en modo cart
  const removeOne = (id: string) => {
    if (checkoutMode === 'cart') {
      removeItem(id);
    } else {
      // Modo buy-now: modificar overrideItems
      setOverrideItems((overrideItems ?? []).filter(i => i.id !== id));
    }
  };

  const inc = (id: string) => {
    if (checkoutMode === 'cart') {
      const item = items.find(i => i.id === id);
      if (item) updateQty(id, item.qty + 1);
    } else {
      // Modo buy-now: modificar overrideItems
      setOverrideItems((overrideItems ?? []).map(i => 
        i.id === id ? { ...i, qty: i.qty + 1 } : i
      ));
    }
  };

  const dec = (id: string) => {
    if (checkoutMode === 'cart') {
      const item = items.find(i => i.id === id);
      if (item) updateQty(id, Math.max(1, item.qty - 1));
    } else {
      // Modo buy-now: modificar overrideItems
      setOverrideItems((overrideItems ?? []).map(i => 
        i.id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i
      ));
    }
  };

  // Botón "Mover al carrito" (solo en modo buy-now)
  const commitOverrideToCart = () => {
    (overrideItems ?? []).forEach(i => addItem(i));
    setOverrideItems(null);
    setCheckoutMode('cart');
  };

  const total = useMemo(
    () => visibleItems.reduce((a, it) => a + it.price * it.qty, 0),
    [visibleItems],
  );

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Checkout</h1>

      {visibleItems.length === 0 ? (
        <div className="mt-6 rounded-lg border p-4">
          <p className="text-sm">Tu checkout está vacío.</p>
          <Link href="/catalogo" className="mt-3 inline-block underline">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <>
          {/* Indicador de modo */}
          {checkoutMode === 'buy-now' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Modo "Comprar ahora" - Estos items no están en tu carrito
              </p>
              <button
                onClick={commitOverrideToCart}
                className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-900"
              >
                Mover al carrito
              </button>
            </div>
          )}

          <ul className="mt-4 divide-y">
            {visibleItems.map((it) => (
              <li
                key={it.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-gray-600">x{it.qty}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="border rounded px-2"
                    onClick={() => dec(it.id)}
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{it.qty}</span>
                  <button
                    className="border rounded px-2"
                    onClick={() => inc(it.id)}
                  >
                    +
                  </button>
                  <span className="w-24 text-right">
                    ${(it.price * it.qty).toFixed(2)} MXN
                  </span>
                  <button
                    className="ml-2 text-red-600"
                    onClick={() => removeOne(it.id)}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-between mt-4 font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)} MXN</span>
          </div>

          <Link
            href="/checkout/datos"
            className="mt-6 inline-block w-full rounded-lg border px-4 py-2 text-center"
          >
            Continuar
          </Link>
        </>
      )}
    </main>
  );
}