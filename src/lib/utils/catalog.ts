// src/lib/utils/catalog.ts
export const PLACEHOLDER = "/img/products/placeholder.png";

export type Product = {
  section: string;
  title: string;
  price: number;
  description: string;
  image: string;   // valor original del CSV
  slug: string;
  imageResolved?: string; // ruta/URL final ya resuelta
};

export function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Drive → CDN directo
export function toDirectDriveUrl(u: string) {
  const url = u.trim();
  if (/^https?:\/\/lh3\.googleusercontent\.com\//i.test(url)) return url;
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
  const m2 = url.match(/[?&](?:id|ids)=([a-zA-Z0-9_-]+)/);
  const id = m1?.[1] || m2?.[1];
  return id ? `https://lh3.googleusercontent.com/d/${id}=w1200` : url;
}

// Uso en cliente (si imageResolved existe, úsala; si no, resolver aquí)
export function imageSrc(image: string, imageResolved?: string) {
  if (imageResolved) return imageResolved;
  if (!image) return PLACEHOLDER;
  const t = image.trim();
  if (/^https?:\/\//i.test(t)) {
    return /^https?:\/\/drive\.google\.com\//i.test(t) ? toDirectDriveUrl(t) : t;
  }
  // Mantener MAYÚSCULAS y espacios codificados para servidores Linux
  const encoded = "/" + ["img", "products", ...t.split("/")]
    .map(seg => encodeURIComponent(seg))
    .join("/");
  return encoded;
}

export function parsePrice(input: unknown): number {
  const s = String(input ?? "0")
    .replace(/\s/g, "")
    .replace(/[^\d.,-]/g, "")
    .replace(/(\d)[.,](?=\d{3}\b)/g, "$1")
    .replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatPrice(n: number) {
  return n > 0 ? mxn.format(n) : "";
}

export function normalizeRow(r: Record<string, string>, fallbackSection: string): Product {
  const section = r.Section || r.section || fallbackSection || "General";
  const title = r.Title || r.title || "";
  const price = parsePrice(r.Price ?? r.price);
  const description = r.Description || r.description || "";
  const image = r.Image || r.image || "";

  return {
    section,
    title,
    price,
    description,
    image,
    slug: slugify(title || `${fallbackSection}-${Math.random().toString(36).slice(2, 8)}`)
  };
}
