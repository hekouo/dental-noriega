"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useCheckoutStore,
  selectCheckoutItems,
  selectSelectedCount,
  selectSelectedTotal,
} from "@/lib/store/checkoutStore";
import CheckoutItemRow from "@/components/CheckoutItemRow";
import CheckoutSummary from "@/components/CheckoutSummary";

function EmptyCheckout() {
  return (
    <section className="mx-auto max-w-3xl p-6 text-center">
      <h1 className="text-2xl font-semibold">Tu checkout está vacío</h1>
      <p className="opacity-70 mt-2">
        Agrega productos desde el catálogo para continuar al pago.
      </p>
      <Link
        href="/catalogo"
        className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 transition-colors"
      >
        Ir al catálogo
      </Link>
    </section>
  );
}

export default function CheckoutIndex() {
  const router = useRouter();

  // Selectores primitivos
  const checkoutItems = useCheckoutStore(selectCheckoutItems);
  const selectedCount = useCheckoutStore(selectSelectedCount);
  const selectedTotal = useCheckoutStore(selectSelectedTotal);

  // Acciones del store
  const selectAllCheckout = useCheckoutStore((s) => s.selectAllCheckout);
  const deselectAllCheckout = useCheckoutStore((s) => s.deselectAllCheckout);
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout);

  // Derivado local
  const hasItems = useMemo(
    () => checkoutItems.length > 0,
    [checkoutItems.length],
  );
  const hasSelected = useMemo(() => selectedCount > 0, [selectedCount]);

  const handleContinue = () => {
    if (hasSelected) {
      router.push("/checkout/pago");
    }
  };

  if (!hasItems) {
    return <EmptyCheckout />;
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <p className="opacity-70 text-sm">
            Selecciona los productos que deseas comprar
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            Seleccionados:{" "}
            <span className="font-semibold">{selectedCount}</span>
          </p>
          <p className="text-lg font-bold text-blue-600">
            Total: ${selectedTotal.toFixed(2)} MXN
          </p>
        </div>
      </header>

      {/* Botones globales */}
      <div className="flex gap-3">
        <button
          onClick={selectAllCheckout}
          className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          Seleccionar todo
        </button>
        <button
          onClick={deselectAllCheckout}
          className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Deseleccionar todo
        </button>
        <button
          onClick={clearCheckout}
          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Vaciar checkout
        </button>
      </div>

      {/* Lista de productos */}
      <section className="space-y-3">
        {checkoutItems.map((item) => (
          <CheckoutItemRow
            key={`${item.id}:${item.variantId || "default"}`}
            id={item.id}
          />
        ))}
      </section>

      {/* Botón continuar */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleContinue}
          disabled={!hasSelected}
          className={[
            "px-8 py-4 rounded-xl font-semibold text-lg transition-all",
            hasSelected
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
              : "bg-gray-300 text-gray-500 cursor-not-allowed",
          ].join(" ")}
        >
          {hasSelected
            ? `Continuar (${selectedCount} productos)`
            : "Selecciona al menos un producto"}
        </button>
      </div>

      {/* Resumen sticky */}
      <CheckoutSummary />
    </main>
  );
}
