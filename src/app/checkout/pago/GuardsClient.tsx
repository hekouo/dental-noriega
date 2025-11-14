"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCheckoutStore, selectIsCheckoutDataComplete } from "@/lib/store/checkoutStore";
import { useCartStore, selectHydrated, selectCount } from "@/lib/store/cartStore";
import { useState, useEffect } from "react";

export default function GuardsClient({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODOS LOS HOOKS AL INICIO - NUNCA CONDICIONALES
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [hasLastOrder, setHasLastOrder] = useState(false);
  
  // Marcar como montado solo en cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Leer localStorage solo después de mount (evitar SSR mismatch)
  useEffect(() => {
    if (!isMounted || typeof window === "undefined") return;
    
    try {
      const stored = localStorage.getItem("DDN_LAST_ORDER_V1");
      setHasLastOrder(!!stored);
    } catch {
      setHasLastOrder(false);
    }
  }, [isMounted]);
  
  // a) Verificar hidratación primero - NO redirigir antes de hidratar
  const hydrated = useCartStore(selectHydrated);
  if (!hydrated || !isMounted) {
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.debug("[GuardsClient] Esperando hidratación o mount...");
    }
    return null; // esperar hidratación, no redirigir
  }

  // b) Verificar flujo Stripe activo - bypass si existe cualquiera de estos params
  const sp = searchParams;
  const hasStripeFlow = !!(
    sp?.has("order") ||
    sp?.has("payment_intent") ||
    sp?.has("client_secret") ||
    sp?.get("redirect_status")
  );
  
  if (hasStripeFlow || hasLastOrder) {
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.debug("[GuardsClient] Bypass por flujo Stripe activo o localStorage.DDN_LAST_ORDER_V1", {
        hasStripeFlow,
        hasLastOrder,
      });
    }
    return <>{children}</>;
  }

  // c) Verificar count del carrito
  const count = useCartStore(selectCount);
  if (count === 0) {
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.debug("[GuardsClient] Carrito vacío, redirigiendo a /checkout/datos");
    }
    router.replace("/checkout/datos");
    return null;
  }

  // d) Verificar datos completos - permitir solo si count > 0 && isComplete === true
  const isComplete = useCheckoutStore(selectIsCheckoutDataComplete);
  if (!isComplete) {
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.debug("[GuardsClient] Datos incompletos, redirigiendo a /checkout/datos");
    }
    router.replace("/checkout/datos");
    return null;
  }

  // e) Todo OK, renderizar children
  if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
    console.debug("[GuardsClient] Acceso permitido", {
      hydrated,
      count,
      isComplete,
      hasStripeFlow,
      sp: sp ? Object.fromEntries(sp.entries()) : {},
    });
  }
  
  return <>{children}</>;
}
