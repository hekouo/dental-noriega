"use client";

import { useMemo } from "react";
import { useCartStore } from "@/lib/store/cartStore";

function EmptyCart() {
  return (
    <section className="mx-auto max-w-3xl p-6 text-center">
      <h1 className="text-2xl font-semibold">Tu carrito está vacío</h1>
      <p className="opacity-70 mt-2">
        Agrega productos para continuar al pago.
      </p>
    </section>
  );
}

export default function CheckoutIndex() {
  // SOLO selectores primitivos: nada de objetos/arrays del selector
  const items = useCartStore((s) => s.items);
  const overrideItems = useCartStore((s) => s.overrideItems);
  const checkoutMode = useCartStore((s) => s.checkoutMode);

  // Derivado MEMO sin crear objetos nuevos innecesarios
  const visibleItems = useMemo(() => {
    const src =
      overrideItems && overrideItems.length > 0 ? overrideItems : items;
    return src ?? [];
  }, [overrideItems, items]);

  // Prohibido: setear store aquí o redirigir en effects.
  if (!visibleItems || visibleItems.length === 0) {
    return <EmptyCart />;
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="opacity-70 text-sm">Modo: {checkoutMode ?? "cart"}</p>
      </header>

      <section className="space-y-3">
        {visibleItems.map((it) => (
          <article key={it.id} className="rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{it.title ?? it.id}</div>
              <div className="opacity-70">x{it.qty ?? 1}</div>
            </div>
          </article>
        ))}
      </section>

      {/* Nada de mutaciones aquí. Los botones que mutan van en componentes aparte y usan handlers de click. */}
    </main>
  );
}
