/**
 * Template de email para pedido entregado
 */

import { SITE_URL } from "@/lib/site";

export type DeliveredTemplateData = {
  order: {
    id: string;
    email?: string | null;
    shipping_tracking_number?: string | null;
    metadata?: {
      contact_name?: string | null;
      contact_email?: string | null;
    } | null;
  };
  siteUrl?: string;
};

export function buildDeliveredEmail(
  data: DeliveredTemplateData,
): { subject: string; html: string; text: string } {
  const siteUrl = data.siteUrl || SITE_URL;
  const orderUrl = `${siteUrl}/cuenta/pedidos/${data.order.id}`;
  const customerName =
    data.order.metadata?.contact_name || "Cliente";
  const trackingNumber = data.order.shipping_tracking_number || null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e;">
    <h1 style="color: #22c55e; margin: 0;">¡Pedido entregado!</h1>
  </div>
  
  <p>Hola ${escapeHtml(customerName)},</p>
  
  <p>Nos complace informarte que tu pedido ha sido entregado exitosamente.</p>
  
  ${trackingNumber
    ? `
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0;"><strong>Número de guía:</strong> ${escapeHtml(trackingNumber)}</p>
    </div>
  `
    : ""}
  
  <p>Esperamos que estés satisfecho con tu compra. Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.</p>
  
  <p style="margin: 20px 0;">
    <a href="${orderUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver detalles del pedido</a>
  </p>
  
  <p>¡Gracias por tu compra!</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    Depósito Dental Noriega<br>
    Insumos y equipos dentales
  </p>
</body>
</html>
  `.trim();

  const text = `
¡Pedido entregado!

Hola ${customerName},

Nos complace informarte que tu pedido ha sido entregado exitosamente.

${trackingNumber ? `Número de guía: ${trackingNumber}\n` : ""}

Esperamos que estés satisfecho con tu compra. Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.

Ver detalles del pedido: ${orderUrl}

¡Gracias por tu compra!

---
Depósito Dental Noriega
Insumos y equipos dentales
  `.trim();

  return {
    subject: `Pedido entregado - ${data.order.id.substring(0, 8)}`,
    html,
    text,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
