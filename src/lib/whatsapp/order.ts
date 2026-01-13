export type WhatsAppOrderContext = "paid" | "pending" | "checkout-help";

function getWhatsAppPhone(): string | null {
  if (typeof process.env.NEXT_PUBLIC_WHATSAPP_PHONE !== "string") return null;
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_PHONE.trim();
  if (!raw) return null;
  // Quita símbolos raros
  return raw.replace(/[^\d]/g, "");
}

function formatMXNFromCents(totalCents: number): string {
  if (!Number.isFinite(totalCents)) return "";
  const amount = totalCents / 100;
  return amount.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatShippingMethod(method?: string): string {
  const methodMap: Record<string, string> = {
    pickup: "Recoger en tienda",
    standard: "Envío estándar",
    express: "Envío express",
    delivery: "Entrega",
  };
  return methodMap[method || ""] || method || "No especificado";
}

// Parámetros para contextos con orden (paid, pending)
interface BuildWhatsAppOrderUrlParams {
  context: "paid" | "pending";
  orderRef: string;
  totalCents: number;
  customerName?: string | null;
  customerEmail?: string | null;
  whatsappWaDigits?: string | null; // Número de WhatsApp del cliente (desde metadata.whatsapp_wa_digits)
}

// Parámetros para contexto de ayuda en checkout (sin orden)
interface BuildWhatsAppCheckoutHelpUrlParams {
  context: "checkout-help";
  subtotalCents: number;
  shippingMethod?: string;
  itemsCount?: number;
  customerName?: string | null;
  customerEmail?: string | null;
  whatsappWaDigits?: string | null; // Número de WhatsApp del cliente (desde metadata.whatsapp_wa_digits)
}

export function buildWhatsAppOrderUrl(
  params: BuildWhatsAppOrderUrlParams | BuildWhatsAppCheckoutHelpUrlParams,
): string | null {
  const phone = getWhatsAppPhone();
  if (!phone) return null;

  if (params.context === "checkout-help") {
    const {
      subtotalCents,
      shippingMethod,
      itemsCount,
      customerName,
      customerEmail,
    } = params;
    const subtotalMXN = formatMXNFromCents(subtotalCents);

    const firstLine = "Hola, necesito ayuda con mi pedido antes de pagar.";

    const detailsLines: string[] = [];

    if (subtotalCents > 0) {
      detailsLines.push(`Subtotal aproximado: ${subtotalMXN}`);
    }

    if (shippingMethod) {
      detailsLines.push(`Método de envío: ${formatShippingMethod(shippingMethod)}`);
    }

    if (itemsCount && itemsCount > 0) {
      detailsLines.push(`Productos en el pedido: ${itemsCount}`);
    }

    if (customerName) {
      detailsLines.push(`Nombre: ${customerName}`);
    }
    if (customerEmail) {
      detailsLines.push(`Correo: ${customerEmail}`);
    }

    const closing =
      "¿Me puedes ayudar con dudas de transferencia o pago con tarjeta, por favor?";

    const messageParts = [firstLine, "", ...detailsLines, "", closing].filter(Boolean);
    const fullMessage = messageParts.join("\n");

    const encoded = encodeURIComponent(fullMessage);
    return `https://wa.me/${phone}?text=${encoded}`;
  }

  // Contextos con orden (paid, pending)
  const { context, orderRef, totalCents, customerName, customerEmail } = params;
  const totalMXN = formatMXNFromCents(totalCents);

  let firstLine: string;
  if (context === "paid") {
    firstLine = `Hola, tengo una duda sobre mi pedido ${orderRef} por un total de ${totalMXN}.`;
  } else {
    firstLine = `Hola, te comparto el comprobante de pago de mi pedido ${orderRef} por un total de ${totalMXN}.`;
  }

  const detailsLines: string[] = [];

  if (customerName) {
    detailsLines.push(`Nombre: ${customerName}`);
  }
  if (customerEmail) {
    detailsLines.push(`Correo: ${customerEmail}`);
  }

  const closing =
    context === "paid"
      ? "¿Me puedes apoyar, por favor?"
      : "¿Me puedes confirmar cuando quede acreditado, por favor?";

  const messageParts = [firstLine, "", ...detailsLines, "", closing].filter(Boolean);
  const fullMessage = messageParts.join("\n");

  const encoded = encodeURIComponent(fullMessage);
  return `https://wa.me/${phone}?text=${encoded}`;
}

