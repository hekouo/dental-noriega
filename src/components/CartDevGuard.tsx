"use client";
import { useEffect } from "react";
import { useCartStore } from "@/lib/store/cartStore";

export default function CartDevGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    let lastTick = 0;
    let opsThisTick = 0;

    const unsub = useCartStore.subscribe((state, prevState) => {
      const now = Date.now();
      if (now - lastTick > 250) {
        lastTick = now;
        opsThisTick = 0;
      }
      opsThisTick++;
      
      if (opsThisTick > 20) {
        console.groupCollapsed(
          `[CART TRIPWIRE] Mutaciones excesivas: ${opsThisTick} en <250ms`
        );
        console.trace("Cart state changed", { state, prevState });
        console.groupEnd();
      }
    });

    return unsub;
  }, []);

  return null;
}
