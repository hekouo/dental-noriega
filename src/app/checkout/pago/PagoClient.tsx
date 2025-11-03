"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useState, useRef } from "react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";
import {
  useSelectedTotal,
  useSelectedItems,
} from "@/lib/store/checkoutSelectors";
import { formatMXN } from "@/lib/utils/currency";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";

type FormValues = {
  paymentMethod: string;
  honorific: string;
};

async function createMockOrder(payload: unknown) {
  // POST opcional a /api/orders/mock si ya existe; si no, simula con Promise
  try {
    const response = await fetch("/api/orders/mock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn("[createMockOrder] Error en API, usando mock local:", error);
  }
  // Simula con Promise si no hay API o falla
  await new Promise((r) => setTimeout(r, 300));
  return { success: true, orderId: `mock-${Date.now()}` };
}

export default function PagoClient() {
  const router = useRouter();
  const datos = useCheckoutStore((s) => s.datos);
  const resetCheckout = useCheckoutStore((s) => s.reset);
  const items = useCartStore((s) => s.cartItems);
  const clearCart = useCartStore((s) => s.clearCart);
  const total = useSelectedTotal();
  const selectedItems = useSelectedItems();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      paymentMethod: "",
      honorific: "Dr.",
    },
  });

  const handlePayNow = async () => {
    if (sendingRef.current || !datos || !items.length) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);

    try {
      const result = await createMockOrder({ datos, items: selectedItems });
      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }
      clearCart();
      resetCheckout();
      router.push(`/checkout/gracias?orden=${result.orderId}`);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(error);
      setError(
        error.message || "No se pudo procesar el pago. Intenta de nuevo.",
      );
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (!datos) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <CheckoutStepIndicator currentStep="pago" />

      <h1 className="text-2xl font-bold mb-6">Confirmar Pago</h1>

      {/* Resumen de envío compacto */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="font-semibold text-sm text-gray-700 mb-1">
              Datos de envío
            </h2>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>
                  {datos.name} {datos.last_name}
                </strong>
              </p>
              <p>{datos.phone}</p>
              <p className="mt-2">
                {datos.address}
                <br />
                {datos.neighborhood}, {datos.city}, {datos.state} {datos.cp}
              </p>
            </div>
          </div>
          <Link
            href="/checkout/datos"
            className="px-3 py-1 text-sm text-primary-600 hover:text-primary-700 underline"
          >
            Editar datos
          </Link>
        </div>
      </div>

      {/* Resumen de productos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2 text-sm text-gray-700">
          Productos seleccionados:
        </h2>
        <ul className="space-y-1">
          {selectedItems.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>{item.title}</span>
              <span>
                {formatMXN(item.price)} x{item.qty}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t">
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>{formatMXN(total)}</span>
          </div>
        </div>
      </div>

      {/* Formulario de pago */}
      <form onSubmit={handleSubmit(handlePayNow)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tratamiento *
          </label>
          <select
            {...register("honorific", {
              required: "El tratamiento es requerido",
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="Dr.">Dr.</option>
            <option value="Dra.">Dra.</option>
          </select>
          {errors.honorific && (
            <p className="text-red-500 text-sm mt-1">
              {errors.honorific.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de pago *
          </label>
          <select
            {...register("paymentMethod", {
              required: "Selecciona un método de pago",
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Selecciona...</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="tarjeta">Tarjeta de crédito/débito</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-red-500 text-sm mt-1">
              {errors.paymentMethod.message}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Link
            href="/checkout/datos"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Volver a datos
          </Link>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            aria-busy={sending}
          >
            {sending ? "Procesando..." : `Pagar ahora - ${formatMXN(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
