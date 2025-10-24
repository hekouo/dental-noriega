import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";

export type FeaturedCsv = {
  Title: string;
  Price: string;
  PriceOld?: string;
  Description?: string;
  Image: string;
  Code?: string;
  Badge?: string;
};

export type FeaturedItem = {
  id: string;
  title: string;
  price: number;
  description?: string;
  image?: string;
  imageResolved?: string;
  code?: string;
  badge?: string;
  slug: string;
  sectionSlug: string;
};

const VALID_SECTIONS = new Set([
  "consumibles-y-profilaxis",
  "equipos",
  "instrumental-clinico",
  "instrumental-ortodoncia",
  "ortodoncia-accesorios-y-retenedores",
  "ortodoncia-arcos-y-resortes",
  "ortodoncia-brackets-y-tubos",
]);

function safeSectionSlug(s: string | undefined) {
  const norm = (s || "").toLowerCase();
  return VALID_SECTIONS.has(norm) ? norm : "consumibles-y-profilaxis";
}

export async function loadFeatured(limit?: number): Promise<FeaturedItem[]> {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "destacados.csv",
    );
    const raw = await fs.readFile(filePath, "utf8");
    const rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
    }) as FeaturedCsv[];

    const items: FeaturedItem[] = rows.map((r, i) => {
      const priceNum = Number(String(r.Price).replace(/[^\d.]/g, "")) || 0;
      const slug = r.Title
        ? r.Title.toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w-]/g, "")
        : `item-${i}`;

      // Convertir URLs de Drive a formato directo si es necesario
      let imageUrl = r.Image;
      if (
        imageUrl &&
        imageUrl.includes("drive.google.com/uc?export=view&id=")
      ) {
        const id = imageUrl.split("id=")[1];
        if (id) {
          imageUrl = `https://lh3.googleusercontent.com/d/${id}=w1200`;
        }
      }

      return {
        id: r.Code || `featured-${i}`,
        title: r.Title,
        price: priceNum,
        description: r.Description || "",
        image: imageUrl,
        imageResolved: imageUrl, // Para compatibilidad con ProductImage
        code: r.Code,
        badge: r.Badge,
        slug,
        sectionSlug: safeSectionSlug("consumibles-y-profilaxis"), // Sección real del catálogo
      };
    });

    return typeof limit === "number" ? items.slice(0, limit) : items;
  } catch (error) {
    console.error("Error loading featured products:", error);
    return [];
  }
}
