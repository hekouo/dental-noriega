/**
 * Helper para construir plantillas de correo de notificaciones de envío
 */

import type { ShippingStatus } from "@/lib/orders/shippingStatus";

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

  // Construir nombre de saludo
  const greeting = customerName ? `Hola ${customerName},` : "Hola,";

  // Construir información de envío
  let shippingInfo = "";
  if (shippingProvider === "pickup") {
    shippingInfo = "Recoger en tienda";
  } else if (shippingProvider && shippingServiceName) {
    shippingInfo = `${shippingServiceName} (${shippingProvider})`;
  } else if (shippingProvider) {
    shippingInfo = shippingProvider;
  }

  // Construir tracking info si existe
  let trackingInfo = "";
  if (trackingNumber) {
    trackingInfo = `<p><strong>Número de guía:</strong> <code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${trackingNumber}</code></p>`;
  }

  // Templates según el estado
  let subject = "";
  let bodyContent = "";

  switch (status) {
    case "ready_for_pickup": {
      subject = "Tu pedido está listo para recoger";
      bodyContent = `
        <p>Tu pedido <strong>#${orderId.slice(0, 8)}</strong> está listo para recoger en tienda.</p>
        ${shippingInfo ? `<p><strong>Método de envío:</strong> ${shippingInfo}</p>` : ""}
        <p>Puedes pasar a recogerlo en nuestro horario de atención.</p>
      `;
      break;
    }
    case "in_transit": {
      subject = "Tu pedido va en camino";
      bodyContent = `
        <p>Tu pedido <strong>#${orderId.slice(0, 8)}</strong> ya está en camino.</p>
        ${shippingInfo ? `<p><strong>Paquetería:</strong> ${shippingInfo}</p>` : ""}
        ${trackingInfo}
        <p>Puedes rastrear tu envío usando el número de guía proporcionado.</p>
      `;
      break;
    }
    case "delivered": {
      subject = "Tu pedido ha sido entregado";
      bodyContent = `
        <p>¡Excelente noticia! Tu pedido <strong>#${orderId.slice(0, 8)}</strong> ha sido entregado.</p>
        ${shippingInfo ? `<p><strong>Paquetería:</strong> ${shippingInfo}</p>` : ""}
        ${trackingInfo}
        <p>Esperamos que disfrutes tu compra. Si tienes alguna pregunta, no dudes en contactarnos.</p>
      `;
      break;
    }
    case "created": {
      subject = "Tu envío ha sido generado";
      bodyContent = `
        <p>Tu pedido <strong>#${orderId.slice(0, 8)}</strong> está siendo preparado para envío.</p>
        ${shippingInfo ? `<p><strong>Paquetería:</strong> ${shippingInfo}</p>` : ""}
        ${trackingInfo}
        <p>Te notificaremos cuando tu pedido esté en camino.</p>
      `;
      break;
    }
    default:
      return null;
  }

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
          <h1 style="color: #1f2937; margin-top: 0;">${subject}</h1>
          <p>${greeting}</p>
          ${bodyContent}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="font-size: 14px; color: #6b7280;">
            <a href="${ordersUrl}" style="color: #2563eb; text-decoration: none;">Ver detalles de tu pedido →</a>
          </p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
            Este es un correo automático. Por favor, no respondas a este mensaje.
          </p>
        </div>
      </body>
    </html>
  `;

  // Construir versión texto plano
  const text = `
${greeting}

${bodyContent.replace(/<[^>]*>/g, "").replace(/\n\s+/g, "\n").trim()}

Ver detalles de tu pedido: ${ordersUrl}

---
Este es un correo automático. Por favor, no respondas a este mensaje.
  `.trim();

  return { subject, html, text };
}
