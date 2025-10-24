"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useCartStore, selectCheckoutItems } from "@/lib/store/cartStore";

export default function PagoPage() {
  const checkoutItems = useCartStore(selectCheckoutItems);

  // Derivado local: solo los seleccionados
  const selectedItems = useMemo(
    () => checkoutItems.filter((i) => i.selected),
    [checkoutItems],
  );

  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [selectedItems],
  );

  const handleConfirmPayment = () => {
    console.log("Confirmando pago para:", selectedItems);
    // Aquí iría la lógica real de pago
    alert("Pago simulado exitoso! (En desarrollo)");
  };

  if (selectedItems.length === 0) {
    return (
      <section className="mx-auto max-w-3xl p-6 text-center">
        <h1 className="text-2xl font-semibold">
          No hay productos seleccionados
        </h1>
        <p className="opacity-70 mt-2">
          Vuelve al checkout y selecciona los productos que deseas comprar.
        </p>
      </section>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Confirmar Pago</h1>
        <p className="opacity-70 text-sm">
          Revisa tu pedido antes de proceder al pago
        </p>
      </header>

      {/* Lista de productos seleccionados */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Productos seleccionados</h2>
        <div className="space-y-3">
          {selectedItems.map((item) => (
            <div
              key={`${item.id}:${item.variantId || "default"}`}
              className="flex items-center gap-4 rounded-xl border p-4"
            >
              {/* Imagen */}
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <span className="text-xs">Sin imagen</span>
                  </div>
                )}
              </div>

              {/* Información del producto */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">
                  ${item.price.toFixed(2)} MXN c/u
                </p>
                {item.variantId && (
                  <p className="text-xs text-gray-400">
                    Variante: {item.variantId}
                  </p>
                )}
              </div>

              {/* Cantidad y subtotal */}
              <div className="text-right">
                <p className="text-sm text-gray-600">Cantidad: {item.qty}</p>
                <p className="font-semibold text-gray-900">
                  ${(item.price * item.qty).toFixed(2)} MXN
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Resumen total */}
      <section className="rounded-xl border p-6 bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Total del pedido</h2>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">
              ${total.toFixed(2)} MXN
            </p>
            <p className="text-sm text-gray-600">
              {selectedItems.length} producto
              {selectedItems.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </section>

      {/* Botón confirmar pago */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleConfirmPayment}
          className="px-8 py-4 rounded-xl font-semibold text-lg bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
        >
          Confirmar Pago
        </button>
      </div>
    </main>
  );
}
