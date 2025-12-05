/**
 * Helper para construir plantillas de correo de notificaciones de envío
 */

import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import { escapeHtml } from "@/lib/utils/escapeHtml";

export type ShippingEmailContext = {
  status: ShippingStatus;
  orderId: string;
  customerEmail: string;
  customerName?: string | null;
  shippingProvider?: string | null;
  shippingServiceName?: string | null;
  trackingNumber?: string | null;
};

/**
 * Construye el contenido de un correo de notificación de envío
 * 
 * Solo genera correos para estos estados:
 * - ready_for_pickup
 * - in_transit
 * - delivered
 * - created (opcional)
 * 
 * Para otros estados, devuelve null
 */
export function buildShippingEmail(
  ctx: ShippingEmailContext,
): { subject: string; html: string; text: string } | null {
  const { status, orderId, customerName, shippingProvider, shippingServiceName, trackingNumber } = ctx;

  // Solo generar correos para estados específicos
  if (
    status !== "ready_for_pickup" &&
    status !== "in_transit" &&
    status !== "delivered" &&
    status !== "created"
  ) {
    return null;
  }

  // Obtener URL base del sitio
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3002";
  const ordersUrl = `${siteUrl}/cuenta/pedidos`;

  // Escapar todos los datos externos para prevenir XSS
  const safeCustomerName = customerName ? escapeHtml(customerName) : null;
  const safeShippingProvider = shippingProvider ? escapeHtml(shippingProvider) : null;
  const safeShippingServiceName = shippingServiceName ? escapeHtml(shippingServiceName) : null;
  const safeTrackingNumber = trackingNumber ? escapeHtml(trackingNumber) : null;
  const safeOrderId = escapeHtml(orderId.slice(0, 8));

  // Construir nombre de saludo
  const greeting = safeCustomerName ? `Hola ${safeCustomerName},` : "Hola,";

  // Construir información de envío
  let shippingInfo = "";
  if (shippingProvider === "pickup") {
    shippingInfo = "Recoger en tienda";
  } else if (safeShippingProvider && safeShippingServiceName) {
    shippingInfo = `${safeShippingServiceName} (${safeShippingProvider})`;
  } else if (safeShippingProvider) {
    shippingInfo = safeShippingProvider;
  }

  // Construir tracking info si existe (HTML)
  let trackingInfoHtml = "";
  if (safeTrackingNumber) {
    trackingInfoHtml = `<p><strong>Número de guía:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${safeTrackingNumber}</code></p>`;
  }

  // Construir tracking info en texto plano
  const trackingInfoText = safeTrackingNumber ? `Número de guía: ${safeTrackingNumber}` : "";

  // Templates según el estado
  let subject = "";
  let bodyContent = "";
  let textBody = "";

  switch (status) {
    case "ready_for_pickup": {
      subject = "Tu pedido está listo para recoger";
      bodyContent = `
        <p>Tu pedido <strong>#${safeOrderId}</strong> está listo para recoger en tienda.</p>
        ${shippingInfo ? `<p><strong>Método de envío:</strong> ${shippingInfo}</p>` : ""}
        <p>Puedes pasar a recogerlo en nuestro horario de atención.</p>
      `;
      textBody = `Tu pedido #${safeOrderId} está listo para recoger en tienda.\n${shippingInfo ? `Método de envío: ${shippingInfo}\n` : ""}Pasa a recogerlo en nuestro horario de atención.`;
      break;
    }
    case "in_transit": {
      subject = "Tu pedido va en camino";
      bodyContent = `
        <p>Tu pedido <strong>#${safeOrderId}</strong> ya está en camino.</p>
        ${shippingInfo ? `<p><strong>Paquetería:</strong> ${shippingInfo}</p>` : ""}
        ${trackingInfoHtml}
        <p>Puedes rastrear tu envío usando el número de guía proporcionado.</p>
      `;
      textBody = `Tu pedido #${safeOrderId} ya está en camino.\n${shippingInfo ? `Paquetería: ${shippingInfo}\n` : ""}${trackingInfoText ? `${trackingInfoText}\n` : ""}Puedes rastrear tu envío usando el número de guía proporcionado.`;
      break;
    }
    case "delivered": {
      subject = "Tu pedido ha sido entregado";
      bodyContent = `
        <p>¡Excelente noticia! Tu pedido <strong>#${safeOrderId}</strong> ha sido entregado.</p>
        ${shippingInfo ? `<p><strong>Paquetería:</strong> ${shippingInfo}</p>` : ""}
        ${trackingInfoHtml}
        <p>Esperamos que disfrutes tu compra. Si tienes alguna pregunta, no dudes en contactarnos.</p>
      `;
      textBody = `¡Excelente noticia! Tu pedido #${safeOrderId} ha sido entregado.\n${shippingInfo ? `Paquetería: ${shippingInfo}\n` : ""}${trackingInfoText ? `${trackingInfoText}\n` : ""}Esperamos que disfrutes tu compra.`;
      break;
    }
    case "created": {
      subject = "Tu envío ha sido generado";
      bodyContent = `
        <p>Tu pedido <strong>#${safeOrderId}</strong> está siendo preparado para envío.</p>
        ${shippingInfo ? `<p><strong>Paquetería:</strong> ${shippingInfo}</p>` : ""}
        ${trackingInfoHtml}
        <p>Te notificaremos cuando tu pedido esté en camino.</p>
      `;
      textBody = `Tu pedido #${safeOrderId} está siendo preparado para envío.\n${shippingInfo ? `Paquetería: ${shippingInfo}\n` : ""}${trackingInfoText ? `${trackingInfoText}\n` : ""}Te notificaremos cuando tu pedido esté en camino.`;
      break;
    }
    default:
      return null;
  }

  // Escapar subject para HTML (aunque normalmente no debería tener HTML, es una medida de seguridad)
  const safeSubject = escapeHtml(subject);

  // Construir HTML completo
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px;">
          <h1 style="color: #1f2937; margin-top: 0;">${safeSubject}</h1>
          <p>${greeting}</p>
          ${bodyContent}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 14px; color: #6b7280;">
            <a href="${escapeHtml(ordersUrl)}" style="color: #2563eb; text-decoration: none;">Ver detalles de tu pedido →</a>
          </p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
            Este es un correo automático. Por favor, no respondas a este mensaje.
          </p>
        </div>
      </body>
    </html>
  `;

  // Construir versión texto plano (sin regexes de sanitización parcial)
  const text = `
${greeting}

${textBody}

Ver detalles de tu pedido: ${ordersUrl}

---
Este es un correo automático. Por favor, no respondas a este mensaje.
  `.trim();

  return { subject, html, text };
}
