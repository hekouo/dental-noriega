"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/orders/paymentStatus";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function PagoPendienteClient() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("order");
  const [order, setOrder] = useState<{
    id: string;
    total_cents: number;
    payment_method: string | null;
    payment_status: string | null;
    contact_name: string | null;
    contact_email: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

        if (!orderId || typeof orderId !== "string") {
          setError("ID de orden inválido");
          setLoading(false);
          return;
        }

        const { data, error: orderError } = await supabase
          .from("orders")
          .select("id, total_cents, payment_method, payment_status, contact_name, contact_email")
          .eq("id", orderId)
          .single();

        if (orderError || !data) {
          setError("No se pudo cargar la información de la orden");
          setLoading(false);
          return;
        }

        setOrder(data);
      } catch (err) {
        setError("Error al cargar la orden");
        console.error(err);
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
  const isCash = paymentMethod === "cash";

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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-3">
                Instrucciones para transferencia bancaria
              </h2>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <strong>1. Realiza la transferencia</strong>
                </p>
                <p>
                  Transfiere el monto de <strong>{formatMXNFromCents(order.total_cents)}</strong> a la siguiente cuenta:
                </p>
                <div className="bg-white rounded-md p-4 border border-blue-300">
                  <p className="font-medium mb-2">Datos bancarios:</p>
                  <p>Banco: [Nombre del banco]</p>
                  <p>CLABE: [CLABE]</p>
                  <p>Cuenta: [Número de cuenta]</p>
                  <p>Beneficiario: Depósito Dental Noriega</p>
                </div>
                <p>
                  <strong>2. Envía el comprobante</strong>
                </p>
                <p>
                  Una vez realizada la transferencia, envía el comprobante por WhatsApp o correo electrónico para que podamos confirmar tu pago y procesar tu pedido.
                </p>
                <p className="text-xs text-gray-600 mt-4">
                  <strong>Nota:</strong> Tu pedido está reservado. En cuanto confirmemos tu pago, actualizaremos el estado a Pagado y procederemos con el envío.
                </p>
              </div>
            </div>
          )}

          {isCash && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-3">
                Instrucciones para pago en efectivo
              </h2>
              <div className="space-y-3 text-sm text-gray-700">
                <p>
                  <strong>1. Realiza el pago</strong>
                </p>
                <p>
                  Puedes pagar el monto de <strong>{formatMXNFromCents(order.total_cents)}</strong> en:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Oxxo (código de barras o referencia)</li>
                  <li>Ventanilla bancaria</li>
                  <li>Tienda física</li>
                </ul>
                <p className="mt-4">
                  <strong>2. Envía el comprobante</strong>
                </p>
                <p>
                  Una vez realizado el pago, envía el comprobante por WhatsApp o correo electrónico para que podamos confirmar tu pago y procesar tu pedido.
                </p>
                <p className="text-xs text-gray-600 mt-4">
                  <strong>Nota:</strong> Tu pedido está reservado. En cuanto confirmemos tu pago, actualizaremos el estado a Pagado y procederemos con el envío.
                </p>
              </div>
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

