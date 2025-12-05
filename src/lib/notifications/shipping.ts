/**
 * Plantillas de correo para notificaciones de envío
 */

import type { ShippingStatus } from "@/lib/orders/shippingStatus";
import { SITE } from "@/lib/site";

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
 * Construye el contenido del correo de notificación de envío
 * Devuelve null si el estado no requiere notificación
 */
export function buildShippingEmail(
  ctx: ShippingEmailContext,
): { subject: string; html: string; text: string } | null {
  // Solo notificar para estos estados
  const notifiableStatuses: ShippingStatus[] = [
    "ready_for_pickup",
    "in_transit",
    "delivered",
    "created",
  ];

  if (!notifiableStatuses.includes(ctx.status)) {
    return null;
  }

  const baseUrl = SITE.url;
  const orderUrl = `${baseUrl}/cuenta/pedidos`;
  const customerName = ctx.customerName || "Cliente";
  const orderRef = ctx.orderId.substring(0, 8).toUpperCase();

  // Construir subject y mensaje según el estado
  let subject: string;
  let statusMessage: string;
  let actionMessage: string;

  switch (ctx.status) {
    case "ready_for_pickup":
      subject = "Tu pedido está listo para recoger";
      statusMessage = "Tu pedido está listo para recoger en tienda";
      actionMessage =
        "Puedes pasar a recogerlo en nuestras instalaciones durante nuestro horario de atención.";
      break;
    case "in_transit":
      subject = "Tu pedido va en camino";
      statusMessage = "Tu pedido ha sido enviado y está en camino";
      actionMessage =
        "Te notificaremos cuando haya sido entregado. Puedes rastrear tu envío usando el número de guía.";
      break;
    case "delivered":
      subject = "Tu pedido ha sido entregado";
      statusMessage = "Tu pedido ha sido entregado exitosamente";
      actionMessage =
        "Esperamos que estés satisfecho con tu compra. Si tienes alguna pregunta, no dudes en contactarnos.";
      break;
    case "created":
      subject = "Tu envío ha sido generado";
      statusMessage = "La guía de envío de tu pedido ha sido generada";
      actionMessage =
        "Tu pedido está siendo preparado para envío. Te notificaremos cuando esté en camino.";
      break;
    default:
      return null;
  }

  // Información de envío
  const shippingInfo: string[] = [];
  if (ctx.shippingProvider && ctx.shippingProvider !== "pickup") {
    const providerName =
      ctx.shippingProvider === "skydropx"
        ? ctx.shippingServiceName || "Skydropx"
        : ctx.shippingProvider;
    shippingInfo.push(`Proveedor: ${providerName}`);
  }
  if (ctx.trackingNumber) {
    shippingInfo.push(`Número de guía: ${ctx.trackingNumber}`);
  }

  // HTML del correo
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin-top: 0;">${subject}</h1>
  </div>
  
  <p>Hola ${customerName},</p>
  
  <p>${statusMessage}.</p>
  
  <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Número de pedido:</strong> ${orderRef}</p>
    ${shippingInfo.length > 0 ? `<p style="margin: 5px 0 0 0;"><strong>${shippingInfo.join("<br>")}</strong></p>` : ""}
  </div>
  
  <p>${actionMessage}</p>
  
  <div style="margin: 30px 0; text-align: center;">
    <a href="${orderUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver detalles del pedido</a>
  </div>
  
  <p style="color: #666; font-size: 14px; margin-top: 30px;">
    Si tienes alguna pregunta, puedes contactarnos en ${SITE.email} o visitar nuestra tienda.
  </p>
  
  <p style="color: #666; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
    Este es un correo automático, por favor no respondas a este mensaje.
  </p>
</body>
</html>
  `.trim();

  // Texto plano
  const text = `
${subject}

Hola ${customerName},

${statusMessage}.

Número de pedido: ${orderRef}
${shippingInfo.length > 0 ? shippingInfo.join("\n") : ""}

${actionMessage}

Ver detalles del pedido: ${orderUrl}

Si tienes alguna pregunta, puedes contactarnos en ${SITE.email} o visitar nuestra tienda.

Este es un correo automático, por favor no respondas a este mensaje.
  `.trim();

  return { subject, html, text };
}

