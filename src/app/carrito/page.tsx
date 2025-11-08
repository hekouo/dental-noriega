"use client";

import { useCartStore } from "@/lib/store/cartStore";
import {
  useCartItems,
  useSelectedCount,
  useSelectedTotal,
} from "@/lib/store/cartSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatMXN } from "@/lib/utils/currency";
import { Trash2, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useCallback, useRef, startTransition } from "react";
import { ROUTES } from "@/lib/routes";
import { buttonPrimary } from "@/lib/styles/button";

export default function CarritoPage() {
  const busyRef = useRef(false);
  const items = useCartItems();
  const selectedCount = useSelectedCount();
  const total = useSelectedTotal();
  const setCartQty = useCartStore((state) => state.setCartQty);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const toggleSelect = useCartStore((state) => state.toggleSelect);
  const selectAll = useCartStore((state) => state.selectAll);
  const deselectAll = useCartStore((state) => state.deselectAll);
  const ingestFromCart = useCheckoutStore.getState().ingestFromCart;
  const router = useRouter();

  useEffect(() => {
    // Prefetch checkout page for faster navigation
    router.prefetch("/checkout");
  }, [router]);

  const onContinuar = useCallback(() => {
    if (busyRef.current) return;
    if (selectedCount === 0) {
      alert("Selecciona al menos un producto para continuar");
      return;
    }
    busyRef.current = true;
    const selected = items.filter((i) => i.selected);
    // escribe UNA vez
    ingestFromCart(selected, true);
    startTransition(() => {
      router.push("/checkout");
      busyRef.current = false;
    });
  }, [selectedCount, items, ingestFromCart, router]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Tu carrito está vacío</h1>
          <p className="text-gray-600 mb-6">
            Agrega productos para comenzar tu compra
          </p>
          <Link href={ROUTES.destacados()} className={buttonPrimary}>
            <span>Ver Productos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Carrito de Compras</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controles de selección */}
          <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Seleccionar todo
              </button>
              <button
                onClick={deselectAll}
                className="text-sm text-gray-600 hover:underline"
              >
                Ninguno
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {selectedCount} de {items.length} productos seleccionados
            </div>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow p-6 flex gap-4"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.selected}
                  onChange={() => toggleSelect(item.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-500">ID: {item.id}</p>
                <p className="text-primary-600 font-bold mt-2">
                  {formatMXN(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() =>
                    setCartQty(item.id, item.variantId, item.qty - 1)
                  }
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Disminuir cantidad"
                >
                  <Minus size={20} />
                </button>
                <span className="w-12 text-center font-medium">{item.qty}</span>
                <button
                  onClick={() =>
                    setCartQty(item.id, item.variantId, item.qty + 1)
                  }
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={20} />
                </button>
              </div>

              <button
                onClick={() => removeFromCart(item.id, item.variantId)}
                className="text-red-600 hover:bg-red-50 p-2 rounded"
                aria-label="Eliminar producto"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4">Resumen</h2>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Productos seleccionados</span>
                <span className="font-medium">{selectedCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatMXN(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Envío</span>
                <span>Se calcula en el checkout</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total estimado</span>
                <span>{formatMXN(total)}</span>
              </div>
            </div>

            <button
              onClick={onContinuar}
              disabled={busyRef.current || selectedCount === 0}
              className={`${buttonPrimary} w-full block text-center disabled:opacity-50 disabled:cursor-not-allowed`}
              aria-busy={busyRef.current}
            >
              {(() => {
                let label: string;
                if (busyRef.current) label = "Procesando...";
                else if (selectedCount === 0) label = "Selecciona productos";
                else label = `Continuar al Checkout (${selectedCount})`;
                return <span>{label}</span>;
              })()}
            </button>

            <Link
              href={ROUTES.destacados()}
              className="block text-center text-primary-600 hover:underline mt-4"
            >
              <span>Seguir comprando</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
