"use server";

import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapRow, Product } from "./mapDbToProduct";

// Helper para logs de debug solo en desarrollo
const dbg = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

export async function getBySection(section: string): Promise<Product[]> {
  noStore();
  const supa = getPublicSupabase();
  // Obtener productos de la sección
  const { data, error } = await supa
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .order("created_at", { ascending: false });

  if (error) {
    dbg("[bySection] supabase error", error);
    return [];
  }

  // Filtrar en memoria: activos y en stock
  const products = (data ?? [])
    .map(mapRow)
    .filter((p) => p.active && p.inStock);

  // Ordenar por created_at desc, luego por slug asc
  products.sort((a, b) => {
    // Primero por created_at (ya viene ordenado de DB, pero por si acaso)
    // Luego por slug alfabéticamente
    return a.slug.localeCompare(b.slug);
  });

  if (products.length === 0) {
    dbg(`[bySection] Sección '${section}' devolvió 0 productos`);
  } else {
    // Debug: imprimir primer item desde DB y tras mapRow (solo en dev)
    const firstRaw = data?.[0];
    if (firstRaw) {
      const firstMapped = mapRow(firstRaw);
      dbg("[bySection] DEBUG - Primer item desde DB:", JSON.stringify({
        id: firstRaw.id,
        product_slug: firstRaw.product_slug,
        active: firstRaw.active,
        in_stock: firstRaw.in_stock,
        price: firstRaw.price,
      }));
      dbg("[bySection] DEBUG - Tras mapRow:", JSON.stringify({
        id: firstMapped.id,
        slug: firstMapped.slug,
        active: firstMapped.active,
        inStock: firstMapped.inStock,
        price: firstMapped.price,
      }));
    }
    dbg(`[bySection] DEBUG - Total items desde DB: ${data?.length ?? 0}`);
    dbg(`[bySection] DEBUG - Total items tras mapRow y filter: ${products.length}`);
  }

  return products;
}
