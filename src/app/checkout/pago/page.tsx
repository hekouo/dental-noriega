"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import Link from "next/link";
import {
  useHasSelected,
  useSelectedTotal,
  useSelectedItems,
} from "@/lib/store/checkoutSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatMXN } from "@/lib/utils/currency";
import { createOrderAction } from "@/lib/actions/createOrder";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";

type FormValues = {
  paymentMethod: string;
  honorific: string;
};

export default function PagoPage() {
  const router = useRouter();
  const hasSelected = useHasSelected();
  const total = useSelectedTotal();
  const selectedItems = useSelectedItems();
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout);
  const datos = useCheckoutStore((s) => s.datos);

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);
  const redirectRef = useRef(false);

  // Guarda: redirigir si no hay datos
  useEffect(() => {
    if (!datos && !redirectRef.current) {
      redirectRef.current = true;
      router.replace("/checkout/datos");
    }
  }, [datos, router]);

  // Guarda: redirigir si no hay productos seleccionados
  useEffect(() => {
    if (!hasSelected && !redirectRef.current) {
      redirectRef.current = true;
      router.replace("/carrito");
    }
  }, [hasSelected, router]);

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

  // Mostrar loading mientras se verifica o redirige
  if (!datos || !hasSelected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Verificando datos...</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormValues) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);

    try {
      const result = await createOrderAction({
        name: `${datos.name} ${datos.last_name}`,
        email: datos.email,
        phone: datos.phone,
        address: `${datos.address}, ${datos.neighborhood}, ${datos.city}, ${datos.state} ${datos.cp}`,
        city: datos.city,
        country: "México",
        paymentMethod: data.paymentMethod,
        honorific: data.honorific,
        items: selectedItems.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          qty: item.qty,
        })),
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }

      clearCheckout();
      router.replace(`/checkout/gracias?orden=${result.orderId}`);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      console.error(error);
      setError(
        error.message || "No se pudo procesar el pago. Intenta de nuevo.",
      );
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {sending ? "Procesando..." : `Confirmar Pago - ${formatMXN(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}
