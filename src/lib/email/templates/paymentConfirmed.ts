/**
 * Template de email para confirmación de pago
 */

import { formatMXNFromCents } from "@/lib/utils/currency";
import { SITE_URL } from "@/lib/site";

export type PaymentConfirmedTemplateData = {
  order: {
    id: string;
    email?: string | null;
    total_cents: number | null;
    metadata?: {
      contact_name?: string | null;
      contact_email?: string | null;
      subtotal_cents?: number;
      shipping_cost_cents?: number;
      discount_cents?: number;
    } | null;
  };
  orderItems?: Array<{
    title: string;
    qty: number;
    unit_price_cents: number;
  }>;
  siteUrl?: string;
};

export function buildPaymentConfirmedEmail(
  data: PaymentConfirmedTemplateData,
): { subject: string; html: string; text: string } {
  const siteUrl = data.siteUrl || SITE_URL;
  const orderUrl = `${siteUrl}/cuenta/pedidos/${data.order.id}`;
  const customerName =
    data.order.metadata?.contact_name || "Cliente";
  const totalFormatted = data.order.total_cents
    ? formatMXNFromCents(data.order.total_cents)
    : "N/A";

  const itemsHtml =
    data.orderItems && data.orderItems.length > 0
      ? `
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Producto</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Cantidad</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Precio</th>
          </tr>
        </thead>
        <tbody>
          ${data.orderItems
            .map(
              (item) => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${escapeHtml(item.title)}</td>
              <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${item.qty}</td>
              <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">${formatMXNFromCents(item.unit_price_cents * item.qty)}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
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
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin: 0;">¡Pago confirmado!</h1>
  </div>
  
  <p>Hola ${escapeHtml(customerName)},</p>
  
  <p>Tu pago ha sido confirmado exitosamente. Estamos procesando tu pedido.</p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;"><strong>Total pagado:</strong> ${totalFormatted}</p>
    <p style="margin: 5px 0 0 0;"><strong>Número de pedido:</strong> ${data.order.id.substring(0, 8)}...</p>
  </div>
  
  ${itemsHtml}
  
  <p>Puedes ver el estado de tu pedido en cualquier momento:</p>
  <p style="margin: 20px 0;">
    <a href="${orderUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Ver mi pedido</a>
  </p>
  
  <p>Te notificaremos cuando tu pedido sea enviado.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    Depósito Dental Noriega<br>
    Insumos y equipos dentales
  </p>
</body>
</html>
  `.trim();

  const text = `
¡Pago confirmado!

Hola ${customerName},

Tu pago ha sido confirmado exitosamente. Estamos procesando tu pedido.

Total pagado: ${totalFormatted}
Número de pedido: ${data.order.id.substring(0, 8)}...

${data.orderItems && data.orderItems.length > 0
  ? `Productos:\n${data.orderItems.map((item) => `- ${item.title} x${item.qty} - ${formatMXNFromCents(item.unit_price_cents * item.qty)}`).join("\n")}\n`
  : ""}

Ver tu pedido: ${orderUrl}

Te notificaremos cuando tu pedido sea enviado.

---
Depósito Dental Noriega
Insumos y equipos dentales
  `.trim();

  return {
    subject: `Pago confirmado - Pedido ${data.order.id.substring(0, 8)}`,
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
