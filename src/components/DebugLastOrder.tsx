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

    const stored = getWithTTL<LastOrder>(KEYS.LAST_ORDER);
    if (stored) {
      setLastOrder(stored);
      const detectedSection =
        stored.items?.[0]?.section || "consumibles-y-profilaxis";
      const excludeSlug = stored.items?.[0]?.slug || "";
      setSection(detectedSection);
      setApiUrl(
        `/api/products/by-section?section=${encodeURIComponent(
          detectedSection,
        )}&excludeSlug=${encodeURIComponent(excludeSlug)}&limit=4`,
      );
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
