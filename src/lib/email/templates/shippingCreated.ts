/**
 * Template de email para envío generado (tracking/label disponible)
 */

import { formatMXNFromCents } from "@/lib/utils/currency";
import { SITE_URL } from "@/lib/site";

export type ShippingCreatedTemplateData = {
  order: {
    id: string;
    email?: string | null;
    shipping_tracking_number?: string | null;
    shipping_label_url?: string | null;
    shipping_provider?: string | null;
    shipping_service_name?: string | null;
    metadata?: {
      contact_name?: string | null;
      contact_email?: string | null;
    } | null;
  };
  siteUrl?: string;
};

export function buildShippingCreatedEmail(
  data: ShippingCreatedTemplateData,
): { subject: string; html: string; text: string } {
  const siteUrl = data.siteUrl || SITE_URL;
  const orderUrl = `${siteUrl}/cuenta/pedidos/${data.order.id}`;
  const customerName =
    data.order.metadata?.contact_name || "Cliente";
  const trackingNumber = data.order.shipping_tracking_number || null;
  const labelUrl = data.order.shipping_label_url || null;
  const provider = data.order.shipping_provider || "el proveedor";
  const serviceName = data.order.shipping_service_name || null;

  const trackingSection = trackingNumber
    ? `
    <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <p style="margin: 0 0 10px 0;"><strong>Número de guía:</strong></p>
      <p style="margin: 0; font-size: 18px; font-weight: bold; color: #2563eb;">${escapeHtml(trackingNumber)}</p>
    </div>
  `
    : "";

  const labelSection = labelUrl
    ? `
    <p style="margin: 20px 0;">
      <a href="${escapeHtml(labelUrl)}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Descargar etiqueta de envío (PDF)</a>
    </p>
  `
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
    <h1 style="color: #2563eb; margin: 0;">¡Tu pedido está en camino!</h1>
  </div>
  
  <p>Hola ${escapeHtml(customerName)},</p>
  
  <p>Tu pedido ha sido enviado a través de ${escapeHtml(provider)}${serviceName ? ` - ${escapeHtml(serviceName)}` : ""}.</p>
  
  ${trackingSection}
  
  ${labelSection}
  
  <p>Puedes rastrear tu pedido y ver más detalles:</p>
  <p style="margin: 20px 0;">
    <a href="${orderUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi pedido</a>
  </p>
  
  <p>Te notificaremos cuando tu pedido sea entregado.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    Depósito Dental Noriega<br>
    Insumos y equipos dentales
  </p>
</body>
</html>
  `.trim();

  const text = `
¡Tu pedido está en camino!

Hola ${customerName},

Tu pedido ha sido enviado a través de ${provider}${serviceName ? ` - ${serviceName}` : ""}.

${trackingNumber ? `Número de guía: ${trackingNumber}\n` : ""}
${labelUrl ? `Descargar etiqueta: ${labelUrl}\n` : ""}

Ver tu pedido: ${orderUrl}

Te notificaremos cuando tu pedido sea entregado.

---
Depósito Dental Noriega
Insumos y equipos dentales
  `.trim();

  return {
    subject: `Tu pedido está en camino${trackingNumber ? ` - Guía ${trackingNumber}` : ""}`,
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
