"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  useHasSelected,
  useSelectedTotal,
  useSelectedIds,
} from "@/lib/store/checkoutSelectors";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatCurrency } from "@/lib/utils/currency";
import { supabase } from "@/lib/supabase/client";

type FormValues = {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  paymentMethod: string;
};

export default function PagoPage() {
  const router = useRouter();
  const hasSelected = useHasSelected();
  const total = useSelectedTotal();
  const ids = useSelectedIds();
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
      const items = useCheckoutStore.getState().checkoutItems.filter((i) => i.selected);
      const subtotal = items.reduce((a, i) => a + (i.price ?? 0) * (i.qty ?? 1), 0);
      const totalAmount = subtotal; // impuestos/descuentos si aplica

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert([
          {
            customer_name: data.name,
            customer_email: data.email,
            customer_phone: data.phone ?? null,
            address: data.address ?? null,
            payment_method: data.paymentMethod,
            subtotal,
            total: totalAmount,
          },
        ])
        .select()
        .single();

      if (orderErr || !order) throw orderErr ?? new Error("No order returned");

      const payload = items.map((i) => ({
        order_id: order.id,
        product_id: i.id,
        name: i.title,
        qty: i.qty ?? 1,
        price: i.price ?? 0,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(payload);
      if (itemsErr) throw itemsErr;

      clearCheckout();
      router.replace(`/checkout/gracias?orden=${order.id}`);
    } catch (e) {
      console.error(e);
      setError("No se pudo procesar el pago. Intenta de nuevo.");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Confirmar Pago</h1>

      {/* Tabla de productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="font-semibold">Productos a pagar</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {useCheckoutStore.getState().checkoutItems
                .filter((i) => i.selected)
                .map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {item.title || `Producto ${item.id}`}
                        </div>
                        <div className="text-sm text-gray-500">ID: {item.id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.qty ?? 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.price ?? 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency((item.price ?? 0) * (item.qty ?? 1))}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                  Total:
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
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