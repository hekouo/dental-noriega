"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useCheckout } from "@/lib/store/checkoutStore";
import { useCartStore, type CartItem } from "@/lib/store/cartStore";

export default function CheckoutIndex() {
  const { items, setItems } = useCheckout();
  const cart = useCartStore();
  const importedRef = useRef(false);
  const clearedRef = useRef(false);

  // Importación única del carrito al checkout
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (importedRef.current) return;

    const already = sessionStorage.getItem("checkout-imported") === "1";
    if (!already && items.length === 0) {
      // 1) Importar una sola vez desde cartStore
      const cartItems: CartItem[] = cart.items;

      if (cartItems.length > 0) {
        setItems(cartItems);
      }
      sessionStorage.setItem("checkout-imported", "1");
    }
    importedRef.current = true;
  }, [setItems, cart.items, items.length]);

  const removeOne = (sku: string) => {
    setItems(items.filter((x) => x.sku !== sku));
    cart.removeItem(sku);
  };

  const inc = (sku: string) => {
    const next = items.map((x) =>
      x.sku === sku ? { ...x, qty: x.qty + 1 } : x,
    );
    setItems(next);
    const it = next.find((i) => i.sku === sku);
    cart.updateQuantity(sku, it?.qty ?? 1);
  };

  const dec = (sku: string) => {
    const prev = items.find((x) => x.sku === sku);
    const nextQty = Math.max(1, (prev?.qty ?? 1) - 1);
    const next = items.map((x) => (x.sku === sku ? { ...x, qty: nextQty } : x));
    setItems(next);
    cart.updateQuantity(sku, nextQty);
  };

  // Cuando el usuario vacíe el checkout, limpiar el carrito SOLO una vez
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (items.length === 0 && !clearedRef.current) {
      // Asegúrate de no estar dentro de un subscribe que reaccione al set de abajo
      cart.clearCart();
      clearedRef.current = true;
    }
  }, [items.length, cart]);

  const total = useMemo(
    () => items.reduce((a, it) => a + it.price * it.qty, 0),
    [items],
  );

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Checkout</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border p-4">
          <p className="text-sm">Tu checkout está vacío.</p>
          <Link href="/catalogo" className="mt-3 inline-block underline">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y">
            {items.map((it) => (
              <li
                key={it.sku}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-sm text-gray-600">x{it.qty}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="border rounded px-2"
                    onClick={() => dec(it.sku)}
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{it.qty}</span>
                  <button
                    className="border rounded px-2"
                    onClick={() => inc(it.sku)}
                  >
                    +
                  </button>
                  <span className="w-24 text-right">
                    ${(it.price * it.qty).toFixed(2)} MXN
                  </span>
                  <button
                    className="ml-2 text-red-600"
                    onClick={() => removeOne(it.sku)}
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
