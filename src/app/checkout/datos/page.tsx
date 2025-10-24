"use client";

import { useMemo } from "react";
import { useCartStore } from "@/lib/store/cartStore";

export default function DatosPage() {
  const items = useCartStore((s) => s.items);
  const overrideItems = useCartStore((s) => s.overrideItems);

  const visibleItems = useMemo(() => {
    const src =
      overrideItems && overrideItems.length > 0 ? overrideItems : items;
    return src ?? [];
  }, [overrideItems, items]);

  if (!visibleItems || visibleItems.length === 0) {
    return (
      <section className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-semibold">No hay nada para procesar</h1>
        <p className="opacity-70 mt-2">Vuelve al carrito y agrega productos.</p>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Datos de Envío</h1>
      <ul className="space-y-2">
        {visibleItems.map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between rounded-xl border p-4"
          >
            <span>{it.title ?? it.id}</span>
            <span className="opacity-70">x{it.qty ?? 1}</span>
          </li>
        ))}
      </ul>
      {/* Formulario de datos va aquí. Nada de efectos que alteren el store. */}
    </main>
  );
}
