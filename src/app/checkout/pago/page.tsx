"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  useHasSelected,
  useSelectedTotal,
  useSelectedItems,
} from "@/lib/store/checkoutSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatCurrency } from "@/lib/utils/currency";
import { createOrderAction } from "@/lib/actions/createOrder";

type FormValues = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  paymentMethod: string;
};

export default function PagoPage() {
  const router = useRouter();
  const hasSelected = useHasSelected();
  const total = useSelectedTotal();
  const selectedItems = useSelectedItems();
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError: setFormError,
  } = useForm<FormValues>();

  const did = useRef(false);
  useEffect(() => {
    if (did.current) return;
    did.current = true;
    if (!hasSelected) router.replace("/carrito");
  }, [hasSelected, router]);

  if (!hasSelected) return <div className="p-6">Redirigiendo a carrito…</div>;

  const onSubmit = async (data: FormValues) => {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError(null);

    try {
      const result = await createOrderAction({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        country: data.country,
        paymentMethod: data.paymentMethod,
        items: selectedItems.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          qty: item.qty
        }))
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to create order");
      }

      clearCheckout();
      router.replace(`/checkout/gracias?orden=${result.orderId}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "No se pudo procesar el pago. Intenta de nuevo.");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Confirmar Pago</h1>

      {/* Resumen de productos */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h2 className="font-semibold mb-2">Productos seleccionados:</h2>
        <ul className="space-y-1">
          {selectedItems.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>{item.title}</span>
              <span>x{item.qty}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 pt-2 border-t">
          <div className="flex justify-between font-semibold">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre completo *
          </label>
          <input
            {...register("name", { required: "El nombre es requerido" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tu nombre completo"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            {...register("email", { 
              required: "El email es requerido",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Email inválido"
              }
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="tu@email.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            {...register("phone")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+52 55 1234 5678"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <textarea
            {...register("address")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Calle, número, colonia, ciudad"
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de pago *
          </label>
          <select
            {...register("paymentMethod", { required: "Selecciona un método de pago" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecciona...</option>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="tarjeta">Tarjeta de crédito/débito</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-red-500 text-sm mt-1">{errors.paymentMethod.message}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Volver
          </button>
          <button
            type="submit"
            disabled={sending}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-busy={sending}
          >
            {sending ? "Procesando..." : `Confirmar Pago - ${formatCurrency(total)}`}
          </button>
        </div>
      </form>
    </div>
  );
}