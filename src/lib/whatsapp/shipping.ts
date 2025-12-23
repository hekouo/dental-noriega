/**
 * Helper para construir URLs de WhatsApp para notificaciones de envío
 */

function getWhatsAppPhone(): string | null {
  if (typeof process.env.NEXT_PUBLIC_WHATSAPP_PHONE !== "string") return null;
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_PHONE.trim();
  if (!raw) return null;
  return raw.replace(/[^\d]/g, "");
}

export interface ShippingNotificationParams {
  orderRef: string;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  shippingStatus: string | null;
  shippingProvider: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
}

/**
 * Construye URL de WhatsApp para notificar tracking al cliente
 */
export function buildShippingNotificationUrl(
  params: ShippingNotificationParams,
): string | null {
  const phone = getWhatsAppPhone();
  if (!phone) return null;

  const {
    orderRef,
    trackingNumber,
    labelUrl,
    shippingStatus,
    shippingProvider,
    customerName,
    customerEmail,
  } = params;

  // Determinar mensaje según el estado y tipo de envío
  let firstLine: string;
  const detailsLines: string[] = [];

  // Pickup (sin shipping_provider o shipping_provider === "pickup")
  if (!shippingProvider || shippingProvider === "pickup") {
    if (shippingStatus === "ready_for_pickup") {
      firstLine = `Hola, tu pedido ${orderRef} está listo para recoger en tienda.`;
      detailsLines.push("Puedes pasar a recogerlo en nuestro horario de atención.");
    } else {
      firstLine = `Hola, información sobre tu pedido ${orderRef}:`;
      detailsLines.push("Este pedido es para recoger en tienda.");
    }
  } else {
    // Envío con paquetería
    if (shippingStatus === "in_transit" || shippingStatus === "label_created") {
      firstLine = `Hola, tu pedido ${orderRef} va en camino.`;
      if (trackingNumber) {
        detailsLines.push(`Número de guía: ${trackingNumber}`);
      }
      if (labelUrl) {
        detailsLines.push(`Etiqueta de envío: ${labelUrl}`);
      }
      detailsLines.push("Puedes rastrear tu envío usando el número de guía proporcionado.");
    } else if (shippingStatus === "delivered") {
      firstLine = `¡Excelente noticia! Tu pedido ${orderRef} ha sido entregado.`;
      if (trackingNumber) {
        detailsLines.push(`Número de guía: ${trackingNumber}`);
      }
      detailsLines.push("Esperamos que disfrutes tu compra.");
    } else {
      // Estado genérico
      firstLine = `Hola, información sobre tu pedido ${orderRef}:`;
      if (trackingNumber) {
        detailsLines.push(`Número de guía: ${trackingNumber}`);
      }
      if (labelUrl) {
        detailsLines.push(`Etiqueta de envío: ${labelUrl}`);
      }
    }
  }

  // Agregar información del cliente si está disponible
  if (customerName) {
    detailsLines.push(`Nombre: ${customerName}`);
  }
  if (customerEmail) {
    detailsLines.push(`Correo: ${customerEmail}`);
  }

  const closing = "Si tienes alguna pregunta, no dudes en contactarnos.";

  const messageParts = [firstLine, "", ...detailsLines, "", closing].filter(Boolean);
  const fullMessage = messageParts.join("\n");

  const encoded = encodeURIComponent(fullMessage);
  return `https://wa.me/${phone}?text=${encoded}`;
}

