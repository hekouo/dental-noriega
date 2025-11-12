"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";

export default function GuardsClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const datos = useCheckoutStore((s) => s.datos);
  const items = useCartStore((s) => s.cartItems);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    // Bypass guard si hay flujo de Stripe activo (order, payment_intent, client_secret)
    const hasStripeFlow = !!(
      searchParams?.get("order") ||
      searchParams?.get("payment_intent") ||
      searchParams?.get("client_secret")
    );

    // No redirigir si estamos en /checkout/gracias
    if (pathname?.startsWith("/checkout/gracias")) {
      return;
    }

    // Si hay flujo Stripe activo, no redirigir a /checkout/datos
    if (hasStripeFlow) {
      return;
    }

    if (!datos) {
      router.replace("/checkout/datos");
      return;
    }
    
    // Solo verificar carrito vacío si no hay flujo Stripe
    if (!items || items.length === 0) {
      router.replace("/carrito");
    }
  }, [hydrated, datos, items, router, searchParams, pathname]);

  if (!hydrated) return null; // o un skeleton
  
  // Bypass guard si hay flujo Stripe activo
  const hasStripeFlow = !!(
    searchParams?.get("order") ||
    searchParams?.get("payment_intent") ||
    searchParams?.get("client_secret")
  );

  // No bloquear si estamos en /checkout/gracias
  if (pathname?.startsWith("/checkout/gracias")) {
    return <>{children}</>;
  }

  if (hasStripeFlow) {
    return <>{children}</>;
  }

  if (!datos || !items?.length) return null; // evitamos parpadeos
  return <>{children}</>;
}
