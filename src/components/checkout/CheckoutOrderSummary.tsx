"use client";

import React from "react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { getSelectedItems, getSelectedSubtotalCents } from "@/lib/checkout/selection";
import { FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/shipping/freeShipping";
import FreeShippingProgress from "@/components/cart/FreeShippingProgress";
import RelatedProductsCompact from "./RelatedProductsCompact";

interface CheckoutOrderSummaryProps {
  className?: string;
  /** En mobile, mostrar resumen en details/summary con total visible en la cabecera */
  collapsibleOnMobile?: boolean;
}

export default function CheckoutOrderSummary({
  className = "",
  collapsibleOnMobile = false,
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

  const totalFormatted = formatMXNFromCents(totalCents);
  const summaryLabel = `Resumen del pedido (${selectedItems.length} ${selectedItems.length === 1 ? "producto" : "productos"}) · Total: ${totalFormatted}`;

  const cardContent = (
    <>
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resumen del pedido</h2>
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
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {item.title || "Producto sin nombre"}
                  </p>
                  {item.variant_detail && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">
                      {item.variant_detail}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cantidad: {qty}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatMXNFromCents(lineTotalCents)}
                  </p>
                  {qty > 1 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatMXNFromCents(priceCents)} c/u
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          {/* Subtotal */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{formatMXNFromCents(subtotalCents)}</span>
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
              <span className="text-gray-600 dark:text-gray-400">
                {formatShippingMethod(shippingMethod)}:
              </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatMXNFromCents(shippingCents)}
              </span>
            </div>
          )}
          {shippingCents === 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Envío:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {formatMXNFromCents(0)}
                {shippingMethod === "pickup" ? (
                  <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">(recoger en tienda)</span>
                ) : subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS ? (
                  <span className="text-green-600 dark:text-green-400 text-xs ml-1">(promo envío gratis desde $2,000)</span>
                ) : null}
              </span>
            </div>
          )}

          {/* Barra de progreso de envío gratis */}
          {shippingMethod !== "pickup" && (
            <div className="pt-2">
              <FreeShippingProgress subtotalCents={subtotalCents} />
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-gray-900 dark:text-gray-100">Total:</span>
            <span className="text-primary-600 dark:text-primary-400">
              {formatMXNFromCents(totalCents)}
            </span>
          </div>
        </div>

        {/* Productos relacionados compactos - solo si hay ≤3 items y subtotal < umbral de envío gratis */}
        {selectedItems.length <= 3 && subtotalCents < FREE_SHIPPING_THRESHOLD_CENTS && (
          <RelatedProductsCompact
            productIds={selectedItems.map((item) => item.id)}
            limit={3}
          />
        )}
      </div>
    </>
  );

  const card = (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}>
      {cardContent}
    </div>
  );

  if (collapsibleOnMobile) {
    return (
      <details
        className="w-full lg:contents"
        open
        aria-label={summaryLabel}
      >
        <summary className="lg:hidden list-none cursor-pointer px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-medium text-gray-900 dark:text-gray-100 flex items-center justify-between gap-2 min-h-[44px]">
          <span className="truncate">{summaryLabel}</span>
          <svg className="w-5 h-5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {card}
      </details>
    );
  }

  return card;
}

