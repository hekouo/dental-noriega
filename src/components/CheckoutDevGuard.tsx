"use client";

import { useEffect } from "react";
import { useCheckoutStore } from "@/lib/store/checkoutStore";

export default function CheckoutDevGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      let writes = 0;
      const unsub = useCheckoutStore.subscribe(() => {
        writes++;
        if (writes > 20)
          console.warn("[checkoutStore] Posible loop: >20 writes en un tick");
        queueMicrotask(() => {
          writes = 0;
        });
      });

      return () => unsub();
    }
  }, []);

  return null;
}
