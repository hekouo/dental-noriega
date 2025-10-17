export function trackWhatsAppClick(payload: { sku: string; title: string; qty: number }) {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", "whatsapp_consulta_click", payload);
  }
}