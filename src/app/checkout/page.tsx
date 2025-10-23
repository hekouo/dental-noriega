"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useCheckout } from "@/lib/store/checkoutStore";

// OJO: tu store del carrito probablemente exporta useCartStore
// Si el nombre es distinto, cámbialo aquí.
import { useCartStore } from "@/lib/store/cartStore";

type AnyItem = {
  id?: string;
  title?: string;
  name?: string;
  price?: number; // pesos (tu cart)
  qty?: number; // cantidad (tu cart)
  unitAmountCents?: number; // alternativa en centavos
  quantity?: number; // alternativa de cantidad
  image?: string;
  imageResolved?: string;
  sectionSlug?: string;
  slug?: string;
};

export default function CheckoutIndex() {
  const { items, setItems } = useCheckout();

  // 1) En el primer render, si checkout está vacío, toma los items del cartStore
  useEffect(() => {
    if (items.length > 0) return;

    // lee el estado actual del carrito sin suscribirte
    const cartItems: AnyItem[] = (useCartStore?.getState?.().items ??
      []) as AnyItem[];

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
        sectionSlug: it.sectionSlug,
        slug: it.slug,
      }));
      setItems(normalized);
    }
  }, [items.length, setItems]);

  // 2) Total en pesos
  const total = useMemo(
    () => items.reduce((a, it) => a + (it.price ?? 0) * (it.qty ?? 1), 0),
    [items],
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
              <li key={it.id} className="py-3 flex justify-between">
                <span>
                  {it.title} × {it.qty ?? 1}
                </span>
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
