// src/lib/readCsv.ts
import Papa from "papaparse";

export type Product = {
  sku: string;
  product_name: string;
  package?: string;
  variant?: string;
  system?: string;
  brand?: string;
  featured: boolean;
  show_on_home: boolean;
  price_mxn?: number;
  discount_pct?: number; // ignored in UI
};

function normalizeHeader(h: string) {
  return h
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}

function toBool(v: string): boolean {
  const s = (v || "").trim().toLowerCase();
  return (
    s === "true" ||
    s === "1" ||
    s === "yes" ||
    s === "y" ||
    s === "si" ||
    s === "sí"
  );
}

function toNum(v: string): number | undefined {
  const n = parseFloat((v || "").trim());
  return Number.isFinite(n) ? n : undefined;
}

export function parseProductsCSV(text: string): Product[] {
  const res = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => normalizeHeader(h),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  if (res.errors && res.errors.length > 0) {
    const first = res.errors[0];
    throw new Error(
      `CSV parse error at row ${first.row ?? "?"}: ${first.message}`,
    );
  }

  const rows = res.data ?? [];
  const out: Product[] = [];

  for (const row of rows) {
    const get = (k: keyof Product | string) =>
      (row[k as string] ?? "").toString();

    out.push({
      sku: get("sku"),
      product_name: get("product_name"),
      package: get("package") || undefined,
      variant: get("variant") || undefined,
      system: get("system") || undefined,
      brand: get("brand") || undefined,
      featured: toBool(get("featured")),
      show_on_home: toBool(get("show_on_home")),
      price_mxn: toNum(get("price_mxn")),
      discount_pct: toNum(get("discount_pct")),
    });
  }

  return out;
}

export async function fetchProducts(csvPath: string): Promise<Product[]> {
  const res = await fetch(csvPath, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} al cargar CSV: ${csvPath}`);
  const text = await res.text();
  return parseProductsCSV(text);
}
