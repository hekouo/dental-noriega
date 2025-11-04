"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";
import { formatMXN } from "@/lib/utils/currency";
import type { ShippingMethod } from "@/lib/store/checkoutStore";

export const dynamic = "force-dynamic";

type LastOrder = {
  orderRef: string;
  total: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
};

function GraciasContent() {
  const searchParams = useSearchParams();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  
  // Leer orderRef de URL o sessionStorage
  const orderRefFromUrl =
    searchParams?.get("orden") || searchParams?.get("order") || "";

  useEffect(() => {
    // Intentar leer de sessionStorage
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem("ddn_last_order");
        if (stored) {
          const parsed = JSON.parse(stored) as LastOrder;
          setLastOrder(parsed);
        }
      } catch (e) {
        console.warn("[Gracias] Error leyendo sessionStorage:", e);
      }
    }
  }, []);

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
              <span className="font-medium">{formatMXN(shippingCost)}</span>
            </div>
          )}
          
          {total > 0 && (
            <div className="flex justify-between font-semibold pt-2 border-t">
              <span>Total:</span>
              <span>{formatMXN(total)}</span>
            </div>
          )}
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Te contactaremos para coordinar el pago y el envío.
      </p>

      <div className="flex gap-3 flex-wrap">
        <Link href="/destacados" className="btn btn-primary">
          Seguir comprando
        </Link>
        <Link href="/catalogo" className="btn">
          Ver catálogo completo
        </Link>
      </div>

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
