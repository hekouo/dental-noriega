"use client";

import { useEffect, useMemo } from "react";
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

function normalize(cartItems: AnyItem[]) {
  return (cartItems ?? []).map((it) => ({
    id: String(
      it.id ??
        it.slug ??
        (typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random()),
    ),
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
}

export default function CheckoutIndex() {
  const { items, setItems } = useCheckout();

  // acciones del carrito real
  const removeFromCart = useCartStore((s: any) => s.remove);
  const clearCart = useCartStore((s: any) => s.clear);
  const setQty = useCartStore((s: any) =>
    typeof s?.setQty === "function" ? s.setQty : null,
  );

  useEffect(() => {
    const sync = () => {
      const cart = (useCartStore.getState?.().items ?? []) as AnyItem[];
      setItems(normalize(cart));
    };

    // primera carga si checkout está vacío
    if (items.length === 0) sync();

    // suscripción con 1 callback (sin subscribeWithSelector)
    const unsub = useCartStore.subscribe?.((state: any, prevState: any) => {
      if (state?.items !== prevState?.items) {
        sync();
      }
    });

    return () => {
      try {
        unsub?.();
      } catch {}
    };
  }, [items.length, setItems]);

  const total = useMemo(
    () =>
      items.reduce(
        (a: number, it: any) =>
          a + (Number(it.price) || 0) * (Number(it.qty) || 1),
        0,
      ),
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
            {items.map((it: any) => (
              <li
                key={it.id}
                className="py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{it.title}</div>
                  <div className="text-sm text-gray-500">
                    ${(Number(it.price) || 0).toFixed(2)} MXN
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {setQty ? (
                      <>
                        <button
                          type="button"
                          className="px-2 py-1 border rounded"
                          onClick={() =>
                            setQty(it.id, Math.max(1, (it.qty ?? 1) - 1))
                          }
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{it.qty ?? 1}</span>
                        <button
                          type="button"
                          className="px-2 py-1 border rounded"
                          onClick={() => setQty(it.id, (it.qty ?? 1) + 1)}
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-500">
                        Cant: {it.qty ?? 1}
                      </span>
                    )}

                    <button
                      type="button"
                      className="ml-4 text-red-600 text-sm underline"
                      onClick={() => removeFromCart?.(it.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <div className="shrink-0 font-medium">
                  ${(Number(it.price || 0) * Number(it.qty || 1)).toFixed(2)}{" "}
                  MXN
                </div>
              </li>
            ))}
          </ul>

          <div className="flex justify-between mt-4 font-semibold">
            <span>Total</span>
            <span>${total.toFixed(2)} MXN</span>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/checkout/datos"
              className="inline-block flex-1 rounded-lg border px-4 py-2 text-center"
            >
              Continuar
            </Link>

            {clearCart && (
              <button
                type="button"
                className="rounded-lg border px-4 py-2"
                onClick={() => clearCart()}
              >
                Vaciar carrito
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
