// src/lib/catalog/getAllFromCatalog.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { getSectionsFromCatalogView } from "@/lib/catalog/getSectionsFromCatalogView.server";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";

type CatalogItem = {
  id: string;
  product_slug: string;
  section: string;
  title: string;
  price_cents?: number;
  price?: number;
  image_url?: string;
};

// eslint-disable-next-line sonarjs/cognitive-complexity -- Función con múltiples fallbacks, necesaria para robustez
export async function getAllFromCatalog(): Promise<CatalogItem[]> {
  // 1) Intento directo a la vista via Supabase
  try {
    const supabase = createServerSupabase();
    // evita cache agresiva en edge
    headers(); // asegura contexto RSC

    // Nota: algunos proyectos tienen price_cents, otros price. Selecciona ambos.
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select("id, product_slug, section, title, price_cents, price, image_url")
      .range(0, 1999); // suficiente para catálogo actual

    if (!error && data && data.length > 0) {
      return data.map((d) => ({
        id: d.id as string,
        product_slug: d.product_slug as string,
        section: d.section as string,
        title: d.title as string,
        price_cents: (d as any).price_cents ?? undefined,
        price: (d as any).price ?? undefined,
        image_url: (d as any).image_url ?? undefined,
      }));
    }
  } catch (e) {
    // noop
  }

  // 2) Fallback: usa los helpers "from view" que ya creaste
  try {
    const sections = await getSectionsFromCatalogView();
    const all: CatalogItem[] = [];

    for (const s of sections) {
      const products = await getProductsBySectionFromView(s.slug);
      for (const p of products) {
        all.push({
          id: p.id,
          product_slug: p.product_slug ?? "",
          section: p.section,
          title: p.title,
          price_cents: (p as any).price_cents,
          price: (p as any).price,
          image_url: p.image_url ?? undefined,
        });
      }
    }

    if (all.length > 0) return all;
  } catch (e) {
    // noop
  }

  // 3) Fallback interno: endpoint /api/products/all si existe
  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.VERCEL_URL ||
      "http://localhost:3000";
    const res = await fetch(`${siteUrl}/api/products/all`, {
      method: "GET",
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) return json as CatalogItem[];
      if (json?.items && Array.isArray(json.items) && json.items.length > 0)
        return json.items as CatalogItem[];
    }
  } catch (e) {
    // noop
  }

  return [];
}

