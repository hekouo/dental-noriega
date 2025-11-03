// src/lib/utils/analytics.ts
/**
 * Utilidades para analítica básica usando gtag/dataLayer.
 * Solo funciona si NEXT_PUBLIC_GTAG_ID está configurado.
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_GTAG_ID) return;

  // Usar dataLayer si está disponible
  if (window.dataLayer) {
    window.dataLayer.push({
      event: eventName,
      ...params,
    });
    return;
  }

  // Fallback a gtag si existe
  if (window.gtag) {
    window.gtag("event", eventName, params);
  }
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}): void {
  trackEvent("add_to_cart", {
    ecommerce: {
      currency: "MXN",
      value: item.price * item.quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        },
      ],
    },
  });
}

export function trackBuyNow(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}): void {
  trackEvent("buy_now", {
    ecommerce: {
      currency: "MXN",
      value: item.price * item.quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
        },
      ],
    },
  });
}

export function trackViewItem(item: {
  id: string;
  name: string;
  price: number;
}): void {
  trackEvent("view_item", {
    ecommerce: {
      currency: "MXN",
      value: item.price,
      items: [
        {
          item_id: item.id,
          item_name: item.name,
          price: item.price,
        },
      ],
    },
  });
}

export function trackSearch(query: string, resultsCount: number): void {
  trackEvent("search", {
    search_term: query,
    results_count: resultsCount,
  });
}
