/**
 * Configuración centralizada de WhatsApp
 * Reutiliza helpers existentes de src/lib/site.ts
 */

import { SITE, waLink } from "@/lib/site";

/**
 * Obtiene el número de WhatsApp desde la configuración
 * @returns Número de WhatsApp o null si no está configurado
 */
export function getWhatsAppPhone(): string | null {
  // Reutilizar SITE.waPhone que ya lee NEXT_PUBLIC_WA_PHONE
  // Si no está definido, retornar null
  const phone = SITE.waPhone;
  if (!phone || phone.trim() === "") {
    return null;
  }
  return phone;
}

/**
 * Mensaje por defecto para WhatsApp
 * @returns Mensaje base para iniciar conversación
 */
export function getWhatsAppDefaultMessage(): string {
  return "Hola, me interesa hacer un pedido en Depósito Dental Noriega.";
}

/**
 * Genera URL de WhatsApp con mensaje personalizado
 * @param message Mensaje personalizado (opcional, usa mensaje por defecto si no se proporciona)
 * @returns URL de WhatsApp o null si el teléfono no está configurado
 */
export function getWhatsAppUrl(message?: string): string | null {
  const phone = getWhatsAppPhone();
  if (!phone) {
    return null;
  }
  
  const finalMessage = message || getWhatsAppDefaultMessage();
  return waLink(finalMessage);
}

/**
 * Genera URL de WhatsApp para consulta de producto específico
 * @param productTitle Título del producto
 * @param section Sección del producto
 * @param quantity Cantidad (opcional)
 * @param price Precio formateado (opcional)
 * @returns URL de WhatsApp o null si el teléfono no está configurado
 */
export function getWhatsAppProductUrl(
  productTitle: string,
  section: string,
  quantity?: number,
  price?: string,
): string | null {
  const phone = getWhatsAppPhone();
  if (!phone) {
    return null;
  }
  
  const parts = [
    `Hola, me interesa: ${productTitle}`,
    `(${section})`,
  ];
  
  if (quantity) {
    parts.push(`Cantidad: ${quantity}`);
  }
  
  if (price) {
    parts.push(`Precio: ${price}`);
  }
  
  const message = parts.join(". ");
  return waLink(message);
}

