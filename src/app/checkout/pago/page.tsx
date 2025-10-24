"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  useCheckoutStore,
  selectSelectedItems,
} from "@/lib/store/checkoutStore";
import { createClient } from "@/lib/supabase/client";

export default function PagoPage() {
  const selectedItems = useCheckoutStore(selectSelectedItems);
  const clearSelectedFromCheckout = useCheckoutStore(
    (s) => s.clearSelectedFromCheckout,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const total = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [selectedItems],
  );

  const handleConfirmPayment = async () => {
    if (isProcessing || selectedItems.length === 0) return;

    setIsProcessing(true);

    try {
      const supabase = createClient();

      // Verificar si el usuario está autenticado
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Redirigir a login si no está autenticado
        router.push("/cuenta?return=/checkout/pago");
        return;
      }

      // Verificar datos mínimos del usuario
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("name, email, phone, address, city")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile?.name ||
        !profile?.email ||
        !profile?.phone
      ) {
        // Redirigir a completar datos si faltan
        router.push("/checkout/datos?return=/checkout/pago");
        return;
      }

      // Crear la orden
      const orderData = {
        user_id: user.id,
        items: selectedItems.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          qty: item.qty,
          variantId: item.variantId,
        })),
        total: total,
        status: "pending",
        created_at: new Date().toISOString(),
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
        alert("Error al procesar el pago. Intenta de nuevo.");
        return;
      }

      // Limpiar solo los productos seleccionados del checkout
      clearSelectedFromCheckout();

      // Redirigir a página de gracias
      router.replace(`/checkout/gracias?orderId=${order.id}`);
    } catch (error) {
      console.error("Error in payment process:", error);
      alert("Error al procesar el pago. Intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
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
          disabled={isProcessing || selectedItems.length === 0}
          className={[
            "px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all",
            isProcessing || selectedItems.length === 0
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-green-600 text-white hover:bg-green-700",
          ].join(" ")}
        >
          {isProcessing ? "Procesando..." : "Confirmar Pago"}
        </button>
      </div>
    </main>
  );
}
