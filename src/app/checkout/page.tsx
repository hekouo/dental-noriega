"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useCheckout } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";

type AnyItem = {
  id?: string;
  title?: string;
  name?: string;
  price?: number;
  qty?: number;
  unitAmountCents?: number;
  quantity?: number;
  image?: string;
  imageResolved?: string;
  sectionSlug?: string;
  slug?: string;
};

export default function CheckoutIndex() {
  const { items, setItems } = useCheckout();
  const cart = useCartStore();
  const importedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (items.length > 0) return;
    if (importedRef.current) return;
    if (sessionStorage.getItem("checkout-imported") === "1") return;

    const cartItems: AnyItem[] = Array.isArray(cart.items)
      ? (cart.items as AnyItem[])
      : [];
    if (!cartItems.length) return;

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
      sectionSlug: it.sectionSlug,
      slug: it.slug,
    }));
    setItems(normalized);
    importedRef.current = true;
    sessionStorage.setItem("checkout-imported", "1");
  }, [items.length, setItems, cart.items]);

  const removeOne = (id: string) => {
    setItems(items.filter((x) => String(x.id) !== String(id)));
    cart.removeItem(id);
  };

  const inc = (id: string) => {
    const next = items.map((x) =>
      String(x.id) === String(id) ? { ...x, qty: (x.qty ?? 1) + 1 } : x,
    );
    setItems(next);
    const it = next.find((i) => String(i.id) === String(id));
    cart.updateQuantity(id, it?.qty ?? 1);
  };

  const dec = (id: string) => {
    const prev = items.find((x) => String(x.id) === String(id));
    const nextQty = Math.max(1, (prev?.qty ?? 1) - 1);
    const next = items.map((x) =>
      String(x.id) === String(id) ? { ...x, qty: nextQty } : x,
    );
    setItems(next);
    cart.updateQuantity(id, nextQty);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (items.length === 0) {
      cart.clearCart(); // asegurar que limpias persistencia
      sessionStorage.setItem("checkout-imported", "1");
    }
  }, [items.length, cart]);

  const total = useMemo(
    () => items.reduce((a, it) => a + (it.price ?? 0) * (it.qty ?? 1), 0),
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
                key={String(it.id)}
                className="py-3 flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="font-medium">{it.title}</div>
                  <div className="text-sm text-gray-600">x{it.qty ?? 1}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="border rounded px-2"
                    onClick={() => dec(String(it.id))}
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{it.qty ?? 1}</span>
                  <button
                    className="border rounded px-2"
                    onClick={() => inc(String(it.id))}
                  >
                    +
                  </button>
                  <span className="w-24 text-right">
                    ${((it.price ?? 0) * (it.qty ?? 1)).toFixed(2)} MXN
                  </span>
                  <button
                    className="ml-2 text-red-600"
                    onClick={() => removeOne(String(it.id))}
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
