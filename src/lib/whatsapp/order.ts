export type WhatsAppOrderContext = "paid" | "pending";

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

interface BuildWhatsAppOrderUrlParams {
  context: WhatsAppOrderContext;
  orderRef: string;
  totalCents: number;
  customerName?: string | null;
  customerEmail?: string | null;
}

export function buildWhatsAppOrderUrl(params: BuildWhatsAppOrderUrlParams): string | null {
  const phone = getWhatsAppPhone();
  if (!phone) return null;

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

