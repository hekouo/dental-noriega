"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import { getWithTTL, KEYS } from "@/lib/utils/persist";
import type { ShippingMethod } from "@/lib/store/checkoutStore";
import RecommendedClient from "./Recommended.client";
import DebugLastOrder from "@/components/DebugLastOrder";
import { useCartStore } from "@/lib/store/cartStore";

export const dynamic = "force-dynamic";

type LastOrder = {
  orderRef: string;
  total: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  couponCode?: string;
  discount?: number;
  items?: Array<{ section?: string; slug?: string }>;
};

function GraciasContent() {
  const searchParams = useSearchParams();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const clearCart = useCartStore((s) => s.clearCart);

  // Leer orderRef de URL
  const orderRefFromUrl =
    searchParams?.get("orden") || searchParams?.get("order") || "";

  useEffect(() => {
    // Intentar leer de persist.ts
    if (typeof window !== "undefined") {
      const stored = getWithTTL<LastOrder>(KEYS.LAST_ORDER);
      if (stored) {
        setLastOrder(stored);
      }
    }
  }, []);

  // Verificar estado de la orden y limpiar carrito solo si es 'paid'
  useEffect(() => {
    if (!orderRefFromUrl) return;

    let ignore = false;
    let timeoutId: NodeJS.Timeout | null = null;

    async function checkOrderStatus() {
      try {
        // Intentar obtener el estado de la orden desde la API
        const response = await fetch(`/api/checkout/order-status?order_id=${encodeURIComponent(orderRefFromUrl)}`, {
          cache: "no-store",
        });

        if (!ignore && response.ok) {
          const data = await response.json();
          const status = (data as { status?: string }).status;

          // Limpiar carrito solo si la orden está 'paid'
          if (status === "paid") {
            clearCart();
          }
        } else if (!ignore) {
          // Si la respuesta no es OK, esperar un poco y reintentar (el webhook puede estar procesando)
          timeoutId = setTimeout(() => {
            if (!ignore) {
              checkOrderStatus();
            }
          }, 2000);
        }
      } catch {
        // Si hay error, esperar y reintentar una vez más
        if (!ignore && !timeoutId) {
          timeoutId = setTimeout(() => {
            if (!ignore) {
              checkOrderStatus();
            }
          }, 2000);
        }
      }
    }

    // Esperar un poco antes de verificar para dar tiempo al webhook de Stripe
    timeoutId = setTimeout(() => {
      if (!ignore) {
        checkOrderStatus();
      }
    }, 1000);

    return () => {
      ignore = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [orderRefFromUrl, clearCart]);

  const orderRef = lastOrder?.orderRef || orderRefFromUrl;
  const shippingMethod = lastOrder?.shippingMethod;
  const shippingCost = lastOrder?.shippingCost ?? 0;
  const total = lastOrder?.total ?? 0;

  const getShippingMethodLabel = (method?: ShippingMethod): string => {
    switch (method) {
      case "pickup":
        return "Recoger en tienda";
      case "standard":
        return "Envío estándar";
      case "express":
        return "Envío express";
      default:
        return "No especificado";
    }
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <CheckoutStepIndicator currentStep="gracias" />

      <h1 className="text-2xl font-semibold mb-4">¡Gracias por tu compra!</h1>

      {orderRef && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 mb-2">
            Tu número de orden es{" "}
            <span className="font-mono font-semibold text-lg">{orderRef}</span>
          </p>
        </div>
      )}

      {!orderRef && (
        <p className="text-gray-600 mb-6">
          Registramos tu pedido. Te contactaremos para coordinar el pago y el
          envío.
        </p>
      )}

      {/* Resumen del pedido */}
      {(lastOrder || shippingMethod) && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
          <h2 className="font-semibold text-lg mb-3">Resumen del pedido</h2>

          {shippingMethod && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Método de envío:</span>
              <span className="font-medium">
                {getShippingMethodLabel(shippingMethod)}
              </span>
            </div>
          )}

          {shippingMethod && shippingMethod !== "pickup" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Costo de envío:</span>
              <span className="font-medium">
                {formatMXNMoney(shippingCost)}
              </span>
            </div>
          )}

          {total > 0 && (
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total:</span>
              <span>{formatMXNMoney(total)}</span>
            </div>
          )}
          {lastOrder?.couponCode && lastOrder?.discount && (
            <div className="flex justify-between text-sm text-green-600 pt-1">
              <span>Cupón {lastOrder.couponCode} aplicado:</span>
              <span>-{formatMXNMoney(lastOrder.discount)}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Te contactaremos para coordinar el pago y el envío.
      </p>

      <div className="flex gap-3 flex-wrap">
        <Link href="/catalogo" className="btn btn-primary">
          Continuar compra
        </Link>
        <Link href="/destacados" className="btn">
          Ver destacados
        </Link>
        <Link href="/catalogo" className="btn">
          Ver catálogo completo
        </Link>
      </div>

      {/* Debug panel */}
      {process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1" && <DebugLastOrder />}

      {/* Recomendaciones */}
      <RecommendedClient />

      <section className="mt-10 text-sm text-gray-500">
        <p>
          Si tienes dudas, escríbenos por WhatsApp desde la burbuja en la
          esquina.
        </p>
      </section>
    </main>
  );
}

export default function GraciasPage() {
  return (
    <Suspense
      fallback={<div className="max-w-3xl mx-auto px-4 py-10">Cargando...</div>}
    >
      <GraciasContent />
    </Suspense>
  );
}
