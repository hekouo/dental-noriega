"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCheckoutStore, selectIsCheckoutDataComplete } from "@/lib/store/checkoutStore";
import { useCartStore, selectHydrated, selectCount } from "@/lib/store/cartStore";

export default function GuardsClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // a) Verificar hidratación primero
  const hydrated = useCartStore(selectHydrated);
  if (!hydrated) {
    // Debug temporal
    if (process.env.NEXT_PUBLIC_DEBUG_CHECKOUT === "1") {
      console.debug("[GuardsClient] Esperando hidratación...");
    }
    return null; // esperar hidratación, no redirigir
  }

  // b) Verificar flujo Stripe activo
  const sp = searchParams;
  const hasStripeFlow = !!(
    sp?.get("order") ||
    sp?.get("payment_intent") ||
    sp?.get("client_secret") ||
    sp?.get("redirect_status")
  );
  
  if (hasStripeFlow) {
    // Debug temporal
    if (process.env.NEXT_PUBLIC_DEBUG_CHECKOUT === "1") {
      console.debug("[GuardsClient] Bypass por flujo Stripe activo");
    }
    return <>{children}</>;
  }

  // c) Verificar count del carrito
  const count = useCartStore(selectCount);
  if (count === 0) {
    // Debug temporal
    if (process.env.NEXT_PUBLIC_DEBUG_CHECKOUT === "1") {
      console.debug("[GuardsClient] Carrito vacío, redirigiendo a /checkout/datos");
    }
    router.replace("/checkout/datos");
    return null;
  }

  // d) Verificar datos completos
  const isComplete = useCheckoutStore(selectIsCheckoutDataComplete);
  if (!isComplete) {
    // Debug temporal
    if (process.env.NEXT_PUBLIC_DEBUG_CHECKOUT === "1") {
      console.debug("[GuardsClient] Datos incompletos, redirigiendo a /checkout/datos");
    }
    router.replace("/checkout/datos");
    return null;
  }

  // e) Todo OK, renderizar children
  // Debug temporal
  if (process.env.NEXT_PUBLIC_DEBUG_CHECKOUT === "1") {
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
