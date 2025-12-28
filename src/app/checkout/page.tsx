"use client";

import { useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Metadata se maneja en el layout o en un wrapper server component si es necesario
// Esta página es client-only, así que el metadata debe estar en un layout padre
import {
  useCheckoutStore,
  selectCheckoutItems,
  selectSelectedCount,
  selectSelectedTotal,
} from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";
import CheckoutItemRow from "@/components/CheckoutItemRow";
import CheckoutSummary from "@/components/CheckoutSummary";
import CheckoutStepper from "@/components/checkout/CheckoutStepper";

function EmptyCheckout() {
  return (
    <section className="mx-auto max-w-3xl p-6 text-center space-y-6">
      <CheckoutStepper current="cart" />
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12">
        <div className="mb-6">
          <svg
            className="mx-auto h-24 w-24 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Tu carrito está vacío
        </h1>
        <p className="text-gray-600 mb-6">
          Agrega productos desde el catálogo para continuar al pago.
        </p>
        <Link
          href="/catalogo"
          className="inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700 transition-colors font-semibold min-h-[44px] inline-flex items-center justify-center"
          aria-label="Ir al catálogo para agregar productos"
        >
          Ir al catálogo
        </Link>
      </div>
    </section>
  );
}

export default function CheckoutIndex() {
  const router = useRouter();
  const did = useRef(false);

  // Sincronizar con cartStore: fuente única de verdad
  const cartItems = useCartStore((s) => s.cartItems);
  const checkoutItems = useCheckoutStore(selectCheckoutItems);
  const selectedCount = useCheckoutStore(selectSelectedCount);
  const selectedTotal = useCheckoutStore(selectSelectedTotal);
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout);
  const clearSelection = useCheckoutStore((s) => s.clearSelection);

  // Acciones del store
  const selectAllCheckout = useCheckoutStore((s) => s.selectAllCheckout);
  const deselectAllCheckout = useCheckoutStore((s) => s.deselectAllCheckout);

  // Guard: si el carrito está vacío, limpiar checkout también
  useEffect(() => {
    if (cartItems.length === 0 && checkoutItems.length > 0) {
      clearCheckout();
      clearSelection();
    }
  }, [cartItems.length, checkoutItems.length, clearCheckout, clearSelection]);

  // Redirect once if no items
  useEffect(() => {
    if (did.current) return;
    if (checkoutItems.length === 0) {
      did.current = true;
      router.replace("/carrito");
    }
  }, [checkoutItems.length, router]);

  // Derivado local
  const hasItems = useMemo(
    () => checkoutItems.length > 0,
    [checkoutItems.length],
  );
  const hasSelected = useMemo(() => selectedCount > 0, [selectedCount]);

  const handleContinue = () => {
    if (hasSelected) {
      router.push("/checkout/datos");
    }
  };

  if (!hasItems) {
    return <EmptyCheckout />;
  }

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
      <CheckoutStepper current="cart" />
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
      <div className="flex flex-wrap gap-3">
        <button
          onClick={selectAllCheckout}
          className="px-4 py-3 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors min-h-[44px] font-medium"
        >
          Seleccionar todo
        </button>
        <button
          onClick={deselectAllCheckout}
          className="px-4 py-3 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors min-h-[44px] font-medium"
        >
          Deseleccionar todo
        </button>
        <button
          onClick={clearCheckout}
          className="px-4 py-3 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors min-h-[44px] font-medium"
        >
          Vaciar checkout
        </button>
      </div>

      {/* Lista de productos */}
      <section className="space-y-4 divide-y divide-gray-200">
        {checkoutItems.map((item) => (
          <div key={`${item.id}:${item.variantId || "default"}`} className="pt-4 first:pt-0">
            <CheckoutItemRow id={item.id} />
          </div>
        ))}
      </section>

      {/* Botón continuar */}
      <div className="flex justify-center pt-6 pb-6">
        <button
          onClick={handleContinue}
          disabled={!hasSelected}
          className={[
            "px-8 py-4 rounded-xl font-semibold text-lg transition-all min-h-[44px] w-full sm:w-auto",
            hasSelected
              ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl active:scale-95"
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
