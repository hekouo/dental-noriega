// src/lib/catalog/resolveProductBySlug.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server-auth";
import { getProductBySlugAnySection } from "@/lib/supabase/catalog";
import { normalizeSlug } from "@/lib/utils/slug";

export type ProductResolved = {
  id: string; // uuid
  section: string; // slug de sección
  slug: string; // slug canónico del producto
  title: string;
  price_cents: number; // normalizado desde price si viene como decimal
  image_url?: string | null;
  in_stock?: boolean | null;
  description?: string | null;
  sku?: string | null;
};

/**
 * Resuelve un producto por slug, con fallback a la vista api_catalog_with_images.
 * Retorna la información canónica del producto incluyendo su sección correcta.
 */
export async function resolveProductBySlug(
  slug: string,
): Promise<ProductResolved | null> {
  const normalizedSlug = normalizeSlug(slug);

  // Intentar fetch normal primero
  const productFromDb = await getProductBySlugAnySection(normalizedSlug);
  if (productFromDb) {
    return {
      id: String(productFromDb.id),
      section: productFromDb.section,
      slug: productFromDb.product_slug,
      title: productFromDb.title,
      price_cents: productFromDb.price_cents,
      image_url: productFromDb.image_url ?? null,
      in_stock: productFromDb.in_stock ?? null,
      sku: null,
      description: null,
    };
  }

  // Fallback: buscar directamente en la vista
  const supabase = createServerSupabase();
  try {
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select("id, section, product_slug, title, price_cents, image_url, in_stock, sku")
      .eq("product_slug", normalizedSlug)
      .limit(1)
      .single();

    if (error || !data) {
      console.warn("[resolveProductBySlug] Product not found:", normalizedSlug);
      return null;
    }

    // Normalizar price a price_cents si viene como decimal
    let price_cents = data.price_cents;
    if (typeof price_cents === "number" && price_cents < 1000) {
      // Si es menor a 1000, probablemente viene como decimal (ej: 12.50)
      price_cents = Math.round(price_cents * 100);
    }

    return {
      id: String(data.id),
      section: String(data.section),
      slug: String(data.product_slug),
      title: String(data.title),
      price_cents,
      image_url: data.image_url ?? null,
      in_stock: data.in_stock ?? null,
      sku: data.sku ?? null,
      description: null,
    };
  } catch (error) {
    console.warn("[resolveProductBySlug] Error:", error);
    return null;
  }
}

