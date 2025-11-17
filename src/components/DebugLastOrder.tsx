// src/components/DebugLastOrder.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getWithTTL, KEYS } from "@/lib/utils/persist";

type LastOrder = {
  orderRef?: string;
  items?: Array<{ section?: string; slug?: string; title?: string }>;
};

export default function DebugLastOrder() {
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [section, setSection] = useState<string>("");
  const [apiUrl, setApiUrl] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Intentar leer de persist.ts primero
    const storedFromPersist = getWithTTL<LastOrder>(KEYS.LAST_ORDER);
    if (storedFromPersist) {
      setLastOrder(storedFromPersist);
      const detectedSection =
        storedFromPersist.items?.[0]?.section || "consumibles-y-profilaxis";
      const excludeSlug = storedFromPersist.items?.[0]?.slug || "";
      setSection(detectedSection);
      setApiUrl(
        `/api/products/by-section?section=${encodeURIComponent(
          detectedSection,
        )}&excludeSlug=${encodeURIComponent(excludeSlug)}&limit=4`,
      );
      return;
    }

    // Fallback: leer directamente de localStorage (formato nuevo con JSON)
    const rawStored = localStorage.getItem(KEYS.LAST_ORDER);
    if (rawStored) {
      try {
        const parsed = JSON.parse(rawStored);
        if (parsed.order_id || parsed.orderRef) {
          const orderData = {
            orderRef: parsed.order_id || parsed.orderRef,
            items: parsed.items || [],
          };
          setLastOrder(orderData);
          
          // Si hay items, configurar section y apiUrl
          if (parsed.items && parsed.items.length > 0) {
            const detectedSection = parsed.items[0]?.section || "consumibles-y-profilaxis";
            const excludeSlug = parsed.items[0]?.slug || "";
            setSection(detectedSection);
            setApiUrl(
              `/api/products/by-section?section=${encodeURIComponent(
                detectedSection,
              )}&excludeSlug=${encodeURIComponent(excludeSlug)}&limit=4`,
            );
          }
        }
      } catch {
        // Si no es JSON válido, intentar como string simple (formato legacy)
        // Verificar que rawStored existe y no es un objeto JSON antes de procesarlo
        if (rawStored && typeof rawStored === "string" && rawStored.length > 0 && !rawStored.startsWith("{")) {
          setLastOrder({
            orderRef: rawStored,
            items: [],
          });
        }
      }
    }
  }, []);

  if (
    process.env.NEXT_PUBLIC_CHECKOUT_DEBUG !== "1" &&
    typeof window !== "undefined" &&
    !new URLSearchParams(window.location.search).has("debug")
  ) {
    return null;
  }

  return (
    <div
      className="mt-6 p-4 bg-gray-900 text-green-400 rounded-lg text-xs font-mono overflow-auto"
      style={{ maxHeight: "400px" }}
    >
      <strong className="block mb-2">🔍 Debug Last Order</strong>
      <div className="space-y-2">
        <div>
          <strong>DDN_LAST_ORDER_V1:</strong>
          <pre className="mt-1 whitespace-pre-wrap">
            {JSON.stringify(lastOrder, null, 2)}
          </pre>
        </div>
        {section && (
          <div>
            <strong>Section detectada:</strong> {section}
          </div>
        )}
        {apiUrl && (
          <div>
            <strong>URL llamada:</strong> {apiUrl}
          </div>
        )}
      </div>
    </div>
  );
}
