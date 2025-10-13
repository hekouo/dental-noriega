// src/lib/readCsv.ts
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
  return h.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function toBool(v: string): boolean {
  const s = (v || "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y" || s === "si" || s === "sí";
}

function toNum(v: string): number | undefined {
  const n = parseFloat((v || "").trim());
  return Number.isFinite(n) ? n : undefined;
}

export function parseProductsCSV(text: string): Product[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];

  const header = lines[0]
    .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
    .map(h => normalizeHeader(h));

  const idx = {
    sku: header.indexOf("sku"),
    product_name: header.indexOf("product_name"),
    package: header.indexOf("package"),
    variant: header.indexOf("variant"),
    system: header.indexOf("system"),
    brand: header.indexOf("brand"),
    featured: header.indexOf("featured"),
    show_on_home: header.indexOf("show_on_home"),
    price_mxn: header.indexOf("price_mxn"),
    discount_pct: header.indexOf("discount_pct"),
  };

  const out: Product[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/)
      .map(c => c.replace(/^"|"$/g, "").trim());
    const get = (j: number) => (j >= 0 && j < cols.length ? cols[j] : "");
    out.push({
      sku: get(idx.sku),
      product_name: get(idx.product_name),
      package: get(idx.package) || undefined,
      variant: get(idx.variant) || undefined,
      system: get(idx.system) || undefined,
      brand: get(idx.brand) || undefined,
      featured: toBool(get(idx.featured)),
      show_on_home: toBool(get(idx.show_on_home)),
      price_mxn: toNum(get(idx.price_mxn)),
      discount_pct: toNum(get(idx.discount_pct)),
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


