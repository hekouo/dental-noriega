"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CheckoutStepIndicator from "@/components/CheckoutStepIndicator";
import { formatMXN as formatMXNMoney } from "@/lib/utils/money";
import { getWithTTL, KEYS } from "@/lib/utils/persist";
import type { ShippingMethod } from "@/lib/store/checkoutStore";
import RecommendedClient from "./Recommended.client";
import DebugLastOrder from "@/components/DebugLastOrder";
import { useCartStore } from "@/lib/store/cartStore";
import { loadStripe } from "@stripe/stripe-js";

type LastOrder = {
  orderRef: string;
  total: number;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  couponCode?: string;
  discount?: number;
  items?: Array<{ section?: string; slug?: string }>;
};

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

export default function GraciasContent() {
  const searchParams = useSearchParams();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [stripeSuccessDetected, setStripeSuccessDetected] = useState(false);
  const [orderRefFromUrl, setOrderRefFromUrl] = useState<string>("");
  const clearCart = useCartStore((s) => s.clearCart);

  // Leer orderRef de URL. Si falta, intentar localStorage (solo en cliente)
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const fromUrl = searchParams?.get("orden") || searchParams?.get("order") || "";
    if (fromUrl) {
      setOrderRefFromUrl(fromUrl);
      return;
    }
    
    // Intentar leer de localStorage
    const stored = localStorage.getItem("DDN_LAST_ORDER_V1");
    if (stored) {
      try {
        // Intentar parsear como JSON (nuevo formato)
        const parsed = JSON.parse(stored);
        setOrderRefFromUrl(parsed.order_id || parsed.orderRef || stored);
      } catch {
        // Si no es JSON, usar como string (formato legacy)
        setOrderRefFromUrl(stored);
      }
    }
  }, [searchParams]);

  // Leer indicadores de Stripe de la URL
  const redirectStatus = searchParams?.get("redirect_status");
  const paymentIntent = searchParams?.get("payment_intent");
  const setupIntent = searchParams?.get("setup_intent");
  const setupIntentClientSecret = searchParams?.get("setup_intent_client_secret");

  useEffect(() => {
    // Intentar leer de persist.ts
    if (typeof window !== "undefined") {
      const stored = getWithTTL<LastOrder>(KEYS.LAST_ORDER);
      if (stored) {
        setLastOrder(stored);
      }
    }
  }, []);

  // Detectar éxito de Stripe desde la URL (fallback cuando Supabase no responde)
  useEffect(() => {
    // Si redirect_status === "succeeded", marcar como paid inmediatamente y limpiar carrito
    if (redirectStatus === "succeeded") {
      setStripeSuccessDetected(true);
      setOrderStatus("paid");
      setIsCheckingPayment(false);
      // Limpiar carrito inmediatamente cuando el pago fue exitoso
      clearCart();
      
      if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
        console.debug("[GraciasContent] Pago exitoso detectado desde redirect_status=succeeded");
      }
      return;
    }

    // Si hay payment_intent, intentar verificar con Stripe (solo si Stripe está disponible)
    if (paymentIntent && stripePromise && typeof window !== "undefined") {
      stripePromise.then((stripe) => {
        if (!stripe) return;
        
        stripe.retrievePaymentIntent(paymentIntent).then(({ paymentIntent: pi }) => {
          if (pi?.status === "succeeded" || pi?.status === "processing" || pi?.status === "requires_capture") {
            setStripeSuccessDetected(true);
            setOrderStatus("paid");
            setIsCheckingPayment(false);
            // Limpiar carrito cuando el pago fue exitoso
            clearCart();
            
            if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
              console.debug("[GraciasContent] Pago exitoso detectado desde PaymentIntent:", pi.status);
            }
          }
        }).catch(() => {
          // Si falla la verificación, continuar con el poll normal
        });
      }).catch(() => {
        // Si falla cargar Stripe, continuar con el poll normal
      });
    }
  }, [redirectStatus, paymentIntent, clearCart]);

  // Verificar estado de la orden y limpiar carrito solo si es 'paid' (fallback a Supabase)
  useEffect(() => {
    // Si ya detectamos éxito de Stripe desde URL, no hacer poll
    if (stripeSuccessDetected) {
      return;
    }

    // Si redirect_status === "succeeded", no hacer poll (ya se manejó arriba)
    if (redirectStatus === "succeeded") {
      return;
    }

    if (!orderRefFromUrl) {
      setIsCheckingPayment(false);
      return;
    }

    let ignore = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let pollCount = 0;
    const maxPolls = 30; // Máximo 60 segundos (30 * 2s)

    async function checkOrderStatus() {
      if (ignore) return;

      try {
        // Intentar obtener el estado de la orden desde la API
        const response = await fetch(`/api/checkout/order-status?order_id=${encodeURIComponent(orderRefFromUrl)}`, {
          cache: "no-store",
        });

        if (!ignore && response.ok) {
          const data = await response.json();
          const status = (data as { status?: string }).status;
          setOrderStatus(status || null);

          // Limpiar carrito solo si la orden está 'paid'
          if (status === "paid") {
            setOrderStatus("paid");
            setIsCheckingPayment(false);
            // Limpiar carrito cuando la orden está pagada
            clearCart();
            
            if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
              console.debug("[GraciasContent] Orden marcada como paid desde API");
            }
            return;
          }

          // Si está failed, dejar de hacer poll
          if (status === "failed") {
            setIsCheckingPayment(false);
            return;
          }

          // Si aún está pending y no hemos alcanzado el máximo, seguir haciendo poll
          if ((status === "pending" || !status) && pollCount < maxPolls) {
            pollCount++;
            timeoutId = setTimeout(() => {
              if (!ignore) {
                checkOrderStatus();
              }
            }, 2000);
          } else {
            setIsCheckingPayment(false);
          }
        } else if (!ignore && pollCount < maxPolls) {
          // Si la respuesta no es OK, esperar un poco y reintentar
          pollCount++;
          timeoutId = setTimeout(() => {
            if (!ignore) {
              checkOrderStatus();
            }
          }, 2000);
        } else {
          setIsCheckingPayment(false);
        }
      } catch {
        // Si hay error, esperar y reintentar una vez más
        if (!ignore && pollCount < maxPolls) {
          pollCount++;
          timeoutId = setTimeout(() => {
            if (!ignore) {
              checkOrderStatus();
            }
          }, 2000);
        } else {
          setIsCheckingPayment(false);
        }
      }
    }

    // Iniciar poll inmediatamente
    checkOrderStatus();

    return () => {
      ignore = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [orderRefFromUrl, clearCart, stripeSuccessDetected, redirectStatus]);

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

      {isCheckingPayment && orderRefFromUrl && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 mb-2 flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            Confirmando pago...
          </p>
          <p className="text-blue-600 text-sm">
            Por favor espera mientras verificamos el estado de tu pago.
          </p>
        </div>
      )}

      {orderRef && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 mb-2">
            Tu número de orden es{" "}
            <span className="font-mono font-semibold text-lg">{orderRef}</span>
          </p>
          {orderStatus && (
            <p className="text-sm text-gray-600 mt-2">
              Estado: <span className="font-medium">{orderStatus}</span>
            </p>
          )}
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

