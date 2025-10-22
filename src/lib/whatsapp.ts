// src/lib/whatsapp.ts
import type { Product } from "./readCsv";

const PHONE = "525531033715"; // +52 55 3103 3715 (sin +)

export function buildProductInquiryMessage(
  product: Product,
  qty: number,
  comment?: string,
): string {
  const lines = [
    `Hola, tengo una duda sobre: ${product.product_name} (SKU ${product.sku})`,
    `Cantidad: ${qty}`,
  ];
  const clean = (comment || "")
    .replace(/\s+/g, " ")
    .replace(/\n+/g, " ")
    .trim();
  if (clean) lines.push(`Comentario: ${clean}`);
  return lines.join("\n");
}

export function buildGenericMessage(context?: {
  sku?: string;
  name?: string;
}): string {
  const base = "Hola, tengo una duda general.";
  if (!context?.sku && !context?.name) return base;
  const extra = [
    context?.name ? `Producto: ${context.name}` : null,
    context?.sku ? `SKU: ${context.sku}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
  return `${base} ${extra ? `(${extra})` : ""}`.trim();
}

export function whatsappUrlFromMessage(
  message: string,
  withUtm = true,
): string {
  const text = encodeURIComponent(message);
  const base = `https://wa.me/${PHONE}?text=${text}`;
  return withUtm
    ? `${base}%20%3Futm_source%3Dapp%26utm_medium%3Dwhatsapp`
    : base;
}
