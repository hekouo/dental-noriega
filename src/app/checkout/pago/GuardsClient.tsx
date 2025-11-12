"use client";

import { useEffect } from "react";
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
  const datos = useCheckoutStore((s) => s.datos);
  const isCheckoutDataComplete = useCheckoutStore(selectIsCheckoutDataComplete);
  const hydrated = useCartStore(selectHydrated);
  const count = useCartStore(selectCount);
  
  // Verificar flujo Stripe activo: order, payment_intent, client_secret, redirect_status
  const hasStripeFlow = !!(
    searchParams?.get("order") ||
    searchParams?.get("payment_intent") ||
    searchParams?.get("client_secret") ||
    searchParams?.get("redirect_status")
  );

  useEffect(() => {
    // a) Si pathname.startsWith("/checkout/gracias") → bypass (no hacer nada)
    if (pathname?.startsWith("/checkout/gracias")) {
      return;
    }

    // b) Si !hydrated → no redirigir aún (esperar hidratación)
    if (!hydrated) {
      return;
    }

    // c) Si hasStripeFlow → bypass (no hacer nada)
    if (hasStripeFlow) {
      return;
    }

    // d) Si count > 0 y isCheckoutDataComplete === true → permitir acceso (no hacer nada)
    if (count > 0 && isCheckoutDataComplete) {
      return;
    }

    // e) Si count > 0 y isCheckoutDataComplete === false → redirigir a /checkout/datos
    if (count > 0 && !isCheckoutDataComplete) {
      router.replace("/checkout/datos");
      return;
    }

    // f) Si count === 0 → redirigir a /checkout/datos (carrito vacío)
    if (count === 0) {
      router.replace("/checkout/datos");
    }
  }, [hydrated, count, isCheckoutDataComplete, hasStripeFlow, pathname, router, searchParams]);

  // Reglas de renderizado:
  // a) Si pathname.startsWith("/checkout/gracias") → render children (bypass)
  if (pathname?.startsWith("/checkout/gracias")) {
    return <>{children}</>;
  }

  // b) Si !hydrated → render null (esperar hidratación)
  if (!hydrated) {
    return null;
  }

  // c) Si hasStripeFlow → render children (bypass)
  if (hasStripeFlow) {
    return <>{children}</>;
  }

  // d) Si count > 0 y isCheckoutDataComplete === true → render children
  if (count > 0 && isCheckoutDataComplete) {
    return <>{children}</>;
  }

  // e) En caso contrario → render null (se redirigirá en useEffect)
  return null;
}
