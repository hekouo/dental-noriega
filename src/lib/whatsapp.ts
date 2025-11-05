// src/lib/whatsapp.ts
/**
 * Helper para generar links de WhatsApp
 */

export function getWhatsAppHref(message: string): string | null {
  const raw =
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE ||
    process.env.NEXT_PUBLIC_WHATSAPP ||
    "";
  const number = raw.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);

  if (!number) return null;

  return `https://wa.me/${number}?text=${text}`;
}
