// src/lib/analytics.ts
/**
 * Función genérica de tracking para analytics usando dataLayer
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Dispara un evento de analytics usando dataLayer
 * @param event Nombre del evento
 * @param payload Datos del evento
 */
export function track(event: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  // Usar dataLayer si está disponible
  if (window.dataLayer) {
    window.dataLayer.push({
      event,
      ...payload,
    });
    return;
  }

  // Fallback a gtag si existe
  if (window.gtag) {
    window.gtag("event", event, payload);
  }
}
