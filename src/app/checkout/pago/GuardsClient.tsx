"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCheckoutStore } from "@/lib/store/checkoutStore";
import { useCartStore } from "@/lib/store/cartStore";

export default function GuardsClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const datos = useCheckoutStore((s) => s.datos);
  const items = useCartStore((s) => s.cartItems);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!datos) {
      router.replace("/checkout/datos");
      return;
    }
    if (!items || items.length === 0) {
      router.replace("/carrito");
    }
  }, [hydrated, datos, items, router]);

  if (!hydrated) return null; // o un skeleton
  if (!datos || !items?.length) return null; // evitamos parpadeos
  return <>{children}</>;
}
