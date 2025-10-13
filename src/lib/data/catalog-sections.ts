// src/lib/data/catalog-sections.ts
import path from "path";
import { promises as fs } from "fs";
import { cache } from "react";
import { readCSV } from "@/lib/utils/csv";
import { normalizeRow, parsePrice, slugify, type Product } from "@/lib/utils/catalog";
import { resolveImagePublicPath } from "@/lib/utils/images.server";

type SectionData = {
  sectionSlug: string;
  sectionName: string;
  file: string;
  items: Product[];
};

const EXCLUDE_FILES = new Set(["destacados_sin_descuento.csv"]);

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, m => m.toUpperCase()).trim();
}

function sectionFromFile(f: string) {
  const base = f.replace(/^catalogo_?section_?/i, "").replace(/\.csv$/i, "");
  const sectionName = titleCase(base || "General");
  return { sectionName, sectionSlug: slugify(sectionName) };
}

function isValid(p: Product, okImg: boolean) {
  return (parsePrice(p.price) || p.price) > 0 && okImg;
}

// Cachear la carga de secciones para mejorar TTFB
export const loadAllSections = cache(async function loadAllSectionsCached(): Promise<SectionData[]> {
  const dir = path.join(process.cwd(), "public", "data");
  const files = (await fs.readdir(dir)).filter(f => /\.csv$/i.test(f) && !EXCLUDE_FILES.has(f));
  const out: SectionData[] = [];
  
  for (const f of files) {
    const meta = sectionFromFile(f);
    try {
      const rows = await readCSV("/data/" + f);
      const baseItems = rows.map(r => normalizeRow(r, meta.sectionName));
      const items: Product[] = [];
      
      for (const it of baseItems) {
        const { resolved, ok } = await resolveImagePublicPath(it.image);
        if (!isValid(it, ok)) continue;
        items.push({ ...it, imageResolved: resolved });
      }
      
      if (items.length) {
        out.push({ ...meta, file: "/data/" + f, items });
      }
    } catch (error) {
      console.error(`Error leyendo ${f}:`, error);
    }
  }
  
  return out.sort((a, b) => a.sectionName.localeCompare(b.sectionName));
});

export async function loadSectionBySlug(s: string) {
  const all = await loadAllSections();
  return all.find(x => x.sectionSlug === s) ?? null;
}

export async function loadProductBySlug(s: string, slug: string) {
  const sec = await loadSectionBySlug(s);
  if (!sec) return null;
  const product = sec.items.find(i => i.slug === slug);
  return product ? { section: sec, product } : null;
}
