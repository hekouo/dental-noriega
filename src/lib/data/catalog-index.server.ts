import "server-only";
import { normalizeSlug } from "@/lib/utils/slug";
import { driveToLh3 } from "@/lib/utils/images";

export type ProductLite = {
  id: string;
  section: string;      // requerido
  slug: string;         // requerido, normalizado
  title: string;
  price: number;
  imageUrl?: string;
  inStock?: boolean;
};

let CACHE: ProductLite[] | null = null;

function loadIndex(): ProductLite[] {
  // TODO: reemplazar esta carga por la real (CSV/JSON/DB)
  // pero normalizando SIEMPRE section y slug.
  if (CACHE) return CACHE;
  
  // Datos de ejemplo hardcodeados para evitar problemas de build
  const raw = [
    {
      id: "1",
      section: "ortodoncia-arcos-y-resortes",
      slug: "arco-niti-rectangular-paquete-con-10",
      title: "ARCO NITI RECTANGULAR PAQUETE CON 10",
      price: 99,
      imageUrl: "https://drive.google.com/uc?export=view&id=1xIYmS2zLwp2R15sUMcgRFx02SFttC7b2",
      inStock: true
    },
    {
      id: "2",
      section: "ortodoncia-arcos-y-resortes",
      slug: "arco-niti-redondo-12-14-16-18-paquete-con-10",
      title: "ARCO NITI REDONDO 12, 14, 16, 18 PAQUETE CON 10",
      price: 39,
      imageUrl: "https://drive.google.com/uc?export=view&id=1N6JiuFXMS9l8intEmU3UbbqSNXfgiGEf",
      inStock: true
    },
    {
      id: "3",
      section: "ortodoncia-brackets-y-tubos",
      slug: "bracket-azdent-malla-100-colado",
      title: "BRACKET AZDENT MALLA 100 COLADO",
      price: 150,
      imageUrl: "https://drive.google.com/uc?export=view&id=1bKnTkWnc6gVnPqsiCmZUhnJ7VH5luC2r",
      inStock: true
    },
    {
      id: "4",
      section: "ortodoncia-brackets-y-tubos",
      slug: "bracket-ceramico-roth-azdent",
      title: "BRACKET CERAMICO ROTH AZDENT",
      price: 200,
      imageUrl: "https://drive.google.com/uc?export=view&id=128Wt6j5xiLUVtGT3ixmh5TUOBeZ-iloM",
      inStock: true
    },
    {
      id: "5",
      section: "equipos",
      slug: "pieza-de-alta-con-luz-led-30-dias-garantia",
      title: "PIEZA DE ALTA CON LUZ LED 30 DIAS GARANTIA",
      price: 2500,
      imageUrl: "https://drive.google.com/uc?export=view&id=1xIYmS2zLwp2R15sUMcgRFx02SFttC7b2",
      inStock: true
    }
  ];
  
  CACHE = raw.map((r, i) => ({
    id: String(r.id ?? i),
    section: normalizeSlug(String(r.section ?? "")),
    slug: normalizeSlug(String(r.slug ?? r.title ?? "")),
    title: String(r.title ?? ""),
    price: Number(r.price ?? 0),
    imageUrl: r.imageUrl ? driveToLh3(r.imageUrl) : undefined,
    inStock: r.inStock ?? true,
  }));
  return CACHE;
}

export function getAll(): ProductLite[] {
  return loadIndex();
}

export function findBySectionSlug(section: string, slug: string): ProductLite | null {
  const s = normalizeSlug(section);
  const g = normalizeSlug(slug);
  return getAll().find(p => p.section === s && p.slug === g) ?? null;
}

export function findByTitleTokens(q: string, minTokens = 2): ProductLite[] {
  const n = normalizeSlug(q);
  const tokens = n.split("-").filter(Boolean);
  if (tokens.length === 0) return [];
  const items = getAll();
  return items.filter(p => {
    const t = normalizeSlug(p.title);
    let hit = 0;
    for (const tok of tokens) if (t.includes(tok)) hit++;
    return hit >= Math.min(minTokens, tokens.length);
  });
}

export function findBySlugAnySection(slug: string): ProductLite | null {
  const normalizedSlug = normalizeSlug(slug);
  return getAll().find(p => p.slug === normalizedSlug) ?? null;
}