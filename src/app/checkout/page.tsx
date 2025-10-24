"use client";

import { useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useCheckout } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";

export default function CheckoutIndex() {
  const { items, setItems } = useCheckout();

  // Cargar del cartStore solo si el checkout está vacío
  useEffect(() => {
    if (items.length > 0) return;
    const cartItems = (useCartStore?.getState?.().items ?? []) as any[];
    if (Array.isArray(cartItems) && cartItems.length) {
      const normalized = cartItems.map((it) => ({
        id: String(it.id ?? it.slug ?? crypto.randomUUID()),
        title: String(it.title ?? it.name ?? "Producto"),
        price: Number(
          it.price ??
            (Number.isFinite(it.unitAmountCents)
              ? Number(it.unitAmountCents) / 100
              : 0),
        ),
        qty: Number(it.qty ?? it.quantity ?? 1),
        image: it.image ?? it.imageResolved,
      }));
      setItems(normalized);
    }
  }, [items.length, setItems]);

  // Total en pesos
  const total = useMemo(
    () => items.reduce((a, it) => a + (it.price ?? 0) * (it.qty ?? 1), 0),
    [items],
  );

  // Helpers contra el cartStore (tolerantes a nombres distintos)
  const syncRemove = useCallback((id: string) => {
    const api: any = useCartStore?.getState?.();
    if (!api) return;
    const result = api.remove?.(id) || api.removeItem?.(id) || api.delete?.(id);
    return result;
  }, []);

  const syncSetQty = useCallback((id: string, qty: number) => {
    const api: any = useCartStore?.getState?.();
    if (!api) return;
    const result =
      api.setQty?.(id, qty) ||
      api.updateQty?.(id, qty) ||
      api.changeQty?.(id, qty);
    return result;
  }, []);

  const handleRemove = useCallback(
    (id: string) => {
      // 1) checkout
      setItems(items.filter((x) => x.id !== id));
      // 2) cart
      try {
        syncRemove(id);
      } catch {
        /* ignore cart sync errors */
      }
    },
    [items, setItems, syncRemove],
  );

  const handleInc = useCallback(
    (id: string) => {
      setItems(items.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)));
      try {
        const next = (items.find((x) => x.id === id)?.qty ?? 1) + 1;
        syncSetQty(id, next);
      } catch {
        /* ignore cart sync errors */
      }
    },
    [items, setItems, syncSetQty],
  );

  const handleDec = useCallback(
    (id: string) => {
      const cur = items.find((x) => x.id === id)?.qty ?? 1;
      const next = Math.max(1, cur - 1);
      setItems(items.map((x) => (x.id === id ? { ...x, qty: next } : x)));
      try {
        syncSetQty(id, next);
      } catch {
        /* ignore cart sync errors */
      }
    },
    [items, setItems, syncSetQty],
  );

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-xl font-semibold">Checkout</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-lg border p-4">
          <p className="text-sm">
            Tu checkout está vacío. Abre el carrito y agrega productos.
          </p>
          <Link href="/catalogo" className="mt-3 inline-block underline">
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-4 divide-y">
            {items.map((it) => (
              <li
                key={it.id}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{it.title}</span>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => handleDec(it.id)}
                      className="rounded border px-2"
                      aria-label="Disminuir"
                    >
                      −
                    </button>
                    <span>{it.qty}</span>
                    <button
                      type="button"
                      onClick={() => handleInc(it.id)}
                      className="rounded border px-2"
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(it.id)}
                      className="ml-3 text-red-600 underline"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
                <span>${((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} MXN</span>
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
