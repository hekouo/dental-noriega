/**
 * Template de email para solicitud de revisión de dirección/datos
 */

import { SITE_URL } from "@/lib/site";

export type NeedsAddressReviewTemplateData = {
  order: {
    id: string;
    email?: string | null;
    metadata?: {
      contact_name?: string | null;
      contact_email?: string | null;
    } | null;
  };
  siteUrl?: string;
};

export function buildNeedsAddressReviewEmail(
  data: NeedsAddressReviewTemplateData,
): { subject: string; html: string; text: string } {
  const siteUrl = data.siteUrl || SITE_URL;
  const orderUrl = `${siteUrl}/cuenta/pedidos/${data.order.id}`;
  const customerName =
    data.order.metadata?.contact_name || "Cliente";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
    <h1 style="color: #f59e0b; margin: 0;">Necesitamos confirmar tus datos</h1>
  </div>
  
  <p>Hola ${escapeHtml(customerName)},</p>
  
  <p>Para procesar tu pedido correctamente, necesitamos que revises y confirmes tu información de envío.</p>
  
  <p style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <strong>Por favor, verifica:</strong><br>
    • Dirección de envío<br>
    • Número de teléfono<br>
    • Código postal
  </p>
  
  <p>Es importante que esta información sea correcta para asegurar que tu pedido llegue sin problemas.</p>
  
  <p style="margin: 20px 0;">
    <a href="${orderUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Revisar y confirmar mis datos</a>
  </p>
  
  <p>Si tienes alguna pregunta, puedes contactarnos por WhatsApp o correo electrónico.</p>
  
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="color: #666; font-size: 12px;">
    Depósito Dental Noriega<br>
    Insumos y equipos dentales
  </p>
</body>
</html>
  `.trim();

  const text = `
Necesitamos confirmar tus datos

Hola ${customerName},

Para procesar tu pedido correctamente, necesitamos que revises y confirmes tu información de envío.

Por favor, verifica:
• Dirección de envío
• Número de teléfono
• Código postal

Es importante que esta información sea correcta para asegurar que tu pedido llegue sin problemas.

Revisar y confirmar mis datos: ${orderUrl}

Si tienes alguna pregunta, puedes contactarnos por WhatsApp o correo electrónico.

---
Depósito Dental Noriega
Insumos y equipos dentales
  `.trim();

  return {
    subject: `Confirma tus datos para el pedido ${data.order.id.substring(0, 8)}`,
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
