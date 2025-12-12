"use client";

import { useEffect } from "react";
import Link from "next/link";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/orders/paymentStatus";
import type { PendingOrder } from "@/lib/orders/getPendingBankTransferOrder.server";
import { useCartStore } from "@/lib/store/cartStore";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import OrderPointsInfo from "@/components/loyalty/OrderPointsInfo";

type Props = {
  order: PendingOrder | null;
  error: "load-error" | "not-found" | null;
};

export default function PagoPendienteClient({ order, error }: Props) {
  const clearCart = useCartStore((s) => s.clearCart);
  const resetCheckout = useCheckoutStore((s) => s.reset);

  // Limpiar carrito y checkout store cuando hay una orden válida
  useEffect(() => {
    if (order && !error) {
      // Limpiar carrito local
      clearCart();
      // Resetear checkout store (incluye orderId, items, etc.)
      resetCheckout();
    }
  }, [order, error, clearCart, resetCheckout]);

  // Si hay error o no hay orden, mostrar bloque de error
  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 mb-2">Error</h1>
          <p className="text-red-600 mb-4">
            {error === "not-found"
              ? "No se encontró la orden"
              : error === "load-error"
                ? "No se pudo cargar la información de la orden"
                : "No se encontró la orden"}
          </p>
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
                    <strong>Favor de poner en CONCEPTO tu nombre y apellido.</strong>
                  </p>
                </div>
                <div className="text-sm text-gray-700">
                  <p className="mb-2">
                    Puedes depositar en ventanilla, cajero, o tiendas como Oxxo, 7-Eleven, etc. usando la tarjeta o la CLABE.
                  </p>
                  <p className="text-xs text-gray-600 mt-3">
                    <strong>Nota importante:</strong> En cuanto recibamos tu comprobante y se acredite el pago, marcaremos tu pedido como pagado y te enviaremos la confirmación.
                  </p>
                </div>
                {/* Instrucciones para enviar comprobante */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <h3 className="font-semibold text-gray-900 mb-3">Después de hacer tu pago</h3>
                  <ul className="space-y-2 text-sm text-gray-700 mb-4 list-disc list-inside">
                    <li>Guarda una foto o PDF de tu comprobante.</li>
                    <li>Envíalo por WhatsApp al +52 553 103 3715.</li>
                    <li>Incluye tu nombre completo y tu número de orden.</li>
                  </ul>
                  {(() => {
                    const orderShortId = order.id.slice(0, 8);
                    const rawMetadata = (order.metadata ?? null) as
                      | { contact_name?: string; contactName?: string }
                      | null;
                    const customerName =
                      rawMetadata?.contact_name ??
                      rawMetadata?.contactName ??
                      "Cliente";
                    const whatsappMessage = `Hola, ya realicé mi pago por transferencia o depósito.\n\nMi número de orden es: ${orderShortId}\nMi nombre: ${customerName}`;
                    const whatsappUrl = `https://wa.me/525531033715?text=${encodeURIComponent(whatsappMessage)}`;
                    return (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
                      >
                        Enviar comprobante por WhatsApp
                      </a>
                    );
                  })()}
                </div>

                {/* Información de puntos de lealtad */}
                {order.total_cents && (
                  <div className="mt-4">
                    <OrderPointsInfo
                      totalCents={order.total_cents}
                      messageType="pending"
                    />
                  </div>
                )}
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

