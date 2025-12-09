"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/orders/paymentStatus";
import { getBrowserSupabase } from "@/lib/supabase/client";

type PendingOrder = {
  id: string;
  total_cents: number;
  payment_method: "card" | "bank_transfer" | null;
  payment_status: "pending" | "paid" | "canceled" | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
};

export default function PagoPendienteClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("order");
  const [order, setOrder] = useState<PendingOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Si no hay orderId, mostrar error sin intentar cargar
    if (!orderId || typeof orderId !== "string") {
      setError("No se encontró información de la orden");
      setLoading(false);
      return;
    }

    async function loadOrder() {
      try {
        const supabase = getBrowserSupabase();
        if (!supabase) {
          setError("No se pudo conectar con el servidor");
          setLoading(false);
          return;
        }

        // orderId ya está validado arriba, pero TypeScript no lo sabe
        if (!orderId || typeof orderId !== "string") {
          setError("ID de orden inválido");
          setLoading(false);
          return;
        }

        const { data, error: orderError } = await supabase
          .from("orders")
          .select("id, total_cents, payment_method, payment_status, email, metadata")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError) {
          console.error("Error loading pending order", { orderId, error: orderError });
          setError("No se pudo cargar la información de la orden");
          setLoading(false);
          return;
        }

        if (!data) {
          console.error("Order not found", { orderId });
          setError("No se encontró la orden");
          setLoading(false);
          return;
        }

        setOrder(data);
      } catch (err) {
        console.error("Error loading pending order", { orderId, error: err });
        setError("Error al cargar la orden");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 mb-2">Error</h1>
          <p className="text-red-600 mb-4">{error || "No se encontró la orden"}</p>
          <Link
            href="/cuenta/pedidos"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            Ver mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  const paymentMethod = order.payment_method;
  const isBankTransfer = paymentMethod === "bank_transfer";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-primary-50 px-6 py-4 border-b border-primary-200">
          <h1 className="text-2xl font-bold text-gray-900">Pago Pendiente</h1>
          <p className="text-sm text-gray-600 mt-1">
            Orden #{order.id.slice(0, 8)}
          </p>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6 space-y-6">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Resumen de tu pedido</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total a pagar:</span>
                <span className="font-semibold text-lg text-gray-900">
                  {formatMXNFromCents(order.total_cents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Método de pago:</span>
                <span className="font-medium text-gray-900">
                  {getPaymentMethodLabel(paymentMethod)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estado:</span>
                <span className="font-medium text-yellow-700">
                  {getPaymentStatusLabel(order.payment_status)}
                </span>
              </div>
            </div>
          </div>

          {/* Instrucciones según método */}
          {isBankTransfer && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-primary-50 px-6 py-4 border-b border-primary-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Datos para transferencia o depósito
                </h2>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="font-semibold text-gray-700">Banco:</span>
                      <span className="ml-2 text-gray-900">BANAMEX</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Beneficiario:</span>
                      <span className="ml-2 text-gray-900">Carlos Javier Noriega Álvarez</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">CLABE:</span>
                      <span className="ml-2 font-mono text-gray-900">002180051867448125</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Tarjeta de débito:</span>
                      <span className="ml-2 font-mono text-gray-900">5204 1674 6723 1890</span>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Por favor coloca en CONCEPTO:</strong> Tu nombre y apellido.
                  </p>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="mb-2">
                    Puedes depositar en ventanilla, cajero, o tiendas como Oxxo, 7-Eleven, etc. usando la tarjeta o la CLABE.
                  </p>
                  <p className="text-xs text-gray-600 mt-3">
                    <strong>Nota importante:</strong> Tu pedido está reservado. En cuanto confirmemos tu pago, actualizaremos el estado a Pagado y procederemos con el envío.
                  </p>
                </div>
              </div>
            </div>
          )}

          {paymentMethod === "card" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="font-semibold text-green-800 mb-2">Pago con Tarjeta</h2>
              <p className="text-green-700">
                Tu pago con tarjeta ha sido procesado. Si ves esta página, es posible que haya habido un error de redirección.
                Por favor, revisa el estado de tu pedido en tu cuenta o contacta a soporte.
              </p>
            </div>
          )}

          {/* Información de contacto */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>¿Necesitas ayuda?</strong> Contáctanos por WhatsApp o correo electrónico para cualquier duda sobre tu pedido.
            </p>
          </div>

          {/* Acciones */}
          <div className="flex gap-4 pt-4 border-t">
            <Link
              href="/cuenta/pedidos"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Ver mis pedidos
            </Link>
            <Link
              href="/catalogo"
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Continuar comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

