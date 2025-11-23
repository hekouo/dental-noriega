"use client";

import React from "react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { getSelectedItems, getSelectedSubtotalCents } from "@/lib/checkout/selection";

interface CheckoutOrderSummaryProps {
  className?: string;
}

export default function CheckoutOrderSummary({
  className = "",
}: CheckoutOrderSummaryProps) {
  const checkoutItems = useCheckoutStore((s) => s.checkoutItems);
  const shippingCost = useCheckoutStore((s) => s.shippingCost) || 0;
  const shippingMethod = useCheckoutStore((s) => s.shippingMethod);
  const couponCode = useCheckoutStore((s) => s.couponCode);
  const discount = useCheckoutStore((s) => s.discount) || 0;
  const discountScope = useCheckoutStore((s) => s.discountScope);

  // Obtener items seleccionados
  const selectedItems = React.useMemo(
    () => getSelectedItems(checkoutItems),
    [checkoutItems],
  );

  // Calcular subtotal en centavos
  const subtotalCents = React.useMemo(
    () => getSelectedSubtotalCents(checkoutItems),
    [checkoutItems],
  );

  // Calcular descuento en centavos
  const discountCents = React.useMemo(() => {
    if (!discount || discount <= 0) return 0;
    if (discountScope === "subtotal") {
      // Descuento sobre subtotal (sin envío)
      return Math.round(subtotalCents * (discount / 100));
    }
    // Descuento fijo
    return Math.round(discount * 100);
  }, [discount, discountScope, subtotalCents]);

  // Calcular envío en centavos
  const shippingCents = Math.round(shippingCost * 100);

  // Calcular total en centavos
  const totalCents = subtotalCents - discountCents + shippingCents;

  // Formatear método de envío
  const formatShippingMethod = (method?: string) => {
    const methodMap: Record<string, string> = {
      pickup: "Recoger en tienda",
      standard: "Envío estándar",
      express: "Envío express",
      delivery: "Entrega",
    };
    return methodMap[method || ""] || method || "No especificado";
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Resumen del pedido</h2>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Lista de productos */}
        <div className="space-y-3">
          {selectedItems.map((item) => {
            const qty = item.qty ?? 1;
            let priceCents: number;
            if (typeof item.price_cents === "number") {
              priceCents = item.price_cents;
            } else if (typeof item.price === "number") {
              priceCents = Math.round(item.price * 100);
            } else {
              priceCents = 0;
            }
            const lineTotalCents = priceCents * qty;

            return (
              <div
                key={`${item.id}:${item.variantId || "default"}`}
                className="flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {item.title || "Producto sin nombre"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Cantidad: {qty}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900">
                    {formatMXNFromCents(lineTotalCents)}
                  </p>
                  {qty > 1 && (
                    <p className="text-xs text-gray-500">
                      {formatMXNFromCents(priceCents)} c/u
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">{formatMXNFromCents(subtotalCents)}</span>
          </div>

          {/* Descuento */}
          {discountCents > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Descuento{couponCode ? ` (${couponCode})` : ""}:
              </span>
              <span className="font-medium">
                -{formatMXNFromCents(discountCents)}
              </span>
            </div>
          )}

          {/* Envío */}
          {shippingCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {formatShippingMethod(shippingMethod)}:
              </span>
              <span className="font-medium">
                {formatMXNFromCents(shippingCents)}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
            <span>Total:</span>
            <span className="text-primary-600">
              {formatMXNFromCents(totalCents)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

