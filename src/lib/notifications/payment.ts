/**
 * Helper para construir plantillas de correo de instrucciones de pago por transferencia
 */

import { escapeHtml } from "@/lib/utils/escapeHtml";
import { formatMXNFromCents } from "@/lib/utils/currency";

export type BankTransferEmailContext = {
  orderId: string;
  customerEmail: string;
  customerName?: string | null;
  totalCents: number;
};

/**
 * Construye el contenido de un correo con instrucciones de pago por transferencia
 */
export function buildBankTransferEmail(
  ctx: BankTransferEmailContext,
): { subject: string; html: string; text: string } {
  const { orderId, customerName, totalCents } = ctx;

  // Escapar todos los datos externos para prevenir XSS
  const safeCustomerName = customerName ? escapeHtml(customerName) : null;
  const safeOrderId = escapeHtml(orderId.slice(0, 8));
  const safeTotal = formatMXNFromCents(totalCents);

  // Construir nombre de saludo
  const greeting = safeCustomerName ? `Hola ${safeCustomerName},` : "Hola,";

  // Construir HTML del correo
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Instrucciones de pago</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px;">Instrucciones de pago para tu pedido</h1>
    <p style="color: #6b7280; margin: 0; font-size: 14px;">Depósito Dental Noriega</p>
  </div>

  <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
    <p style="margin: 0 0 16px 0;">${greeting}</p>
    
    <p style="margin: 0 0 16px 0;">Gracias por tu pedido. Para completar tu compra, por favor realiza el pago por transferencia o depósito bancario usando los siguientes datos:</p>

    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
      <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Resumen de tu pedido</h2>
      <div style="margin-bottom: 12px;">
        <span style="color: #6b7280; font-size: 14px;">Número de orden:</span>
        <span style="color: #1f2937; font-weight: 600; margin-left: 8px; font-family: monospace;">#${safeOrderId}</span>
      </div>
      <div>
        <span style="color: #6b7280; font-size: 14px;">Total a pagar:</span>
        <span style="color: #1f2937; font-weight: 600; margin-left: 8px; font-size: 18px;">${safeTotal}</span>
      </div>
    </div>

    <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fde68a; margin: 20px 0;">
      <p style="margin: 0; color: #92400e; font-size: 14px;">
        <strong>Método de pago:</strong> Transferencia / Depósito
      </p>
    </div>

    <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
      <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Datos para transferencia o depósito</h2>
      
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 16px;">
        <div style="margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">Banco:</span>
          <span style="color: #1f2937; margin-left: 8px;">BANAMEX</span>
        </div>
        <div style="margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">Beneficiario:</span>
          <span style="color: #1f2937; margin-left: 8px;">Carlos Javier Noriega Álvarez</span>
        </div>
        <div style="margin-bottom: 12px;">
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">CLABE:</span>
          <span style="color: #1f2937; margin-left: 8px; font-family: monospace;">002180051867448125</span>
        </div>
        <div>
          <span style="color: #6b7280; font-size: 14px; font-weight: 600;">Tarjeta de débito:</span>
          <span style="color: #1f2937; margin-left: 8px; font-family: monospace;">5204 1674 6723 1890</span>
        </div>
      </div>

      <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border: 1px solid #fde68a; margin-bottom: 16px;">
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>Favor de poner en CONCEPTO tu nombre y apellido.</strong>
        </p>
      </div>

      <p style="margin: 16px 0; color: #6b7280; font-size: 14px;">
        Puedes depositar en ventanilla, cajero, o tiendas como Oxxo, 7-Eleven, etc. usando la tarjeta o la CLABE.
      </p>
    </div>

    <div style="background-color: #dbeafe; padding: 16px; border-radius: 8px; border: 1px solid #93c5fd; margin: 20px 0;">
      <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">Después de hacer tu pago</h3>
      <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px;">
        <li style="margin-bottom: 8px;">Guarda una foto o PDF de tu comprobante.</li>
        <li style="margin-bottom: 8px;">Envíalo por WhatsApp al +52 553 103 3715.</li>
        <li>Incluye tu nombre completo y tu número de orden.</li>
      </ul>
    </div>

    <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
      <strong>Nota importante:</strong> En cuanto recibamos tu comprobante y se acredite el pago, marcaremos tu pedido como pagado y te enviaremos la confirmación.
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">Si tienes alguna duda, contáctanos por WhatsApp o correo electrónico.</p>
  </div>
</body>
</html>
  `.trim();

  // Versión texto plano
  const text = `
Instrucciones de pago para tu pedido
Depósito Dental Noriega

${greeting}

Gracias por tu pedido. Para completar tu compra, por favor realiza el pago por transferencia o depósito bancario usando los siguientes datos:

RESUMEN DE TU PEDIDO
Número de orden: #${safeOrderId}
Total a pagar: ${safeTotal}

MÉTODO DE PAGO: Transferencia / Depósito

DATOS PARA TRANSFERENCIA O DEPÓSITO

Banco: BANAMEX
Beneficiario: Carlos Javier Noriega Álvarez
CLABE: 002180051867448125
Tarjeta de débito: 5204 1674 6723 1890

IMPORTANTE: Favor de poner en CONCEPTO tu nombre y apellido.

Puedes depositar en ventanilla, cajero, o tiendas como Oxxo, 7-Eleven, etc. usando la tarjeta o la CLABE.

DESPUÉS DE HACER TU PAGO
- Guarda una foto o PDF de tu comprobante.
- Envíalo por WhatsApp al +52 553 103 3715.
- Incluye tu nombre completo y tu número de orden.

Nota importante: En cuanto recibamos tu comprobante y se acredite el pago, marcaremos tu pedido como pagado y te enviaremos la confirmación.

Si tienes alguna duda, contáctanos por WhatsApp o correo electrónico.
  `.trim();

  return {
    subject: "Instrucciones de pago para tu pedido en Depósito Dental Noriega",
    html,
    text,
  };
}

