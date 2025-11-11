// src/lib/catalog/getProduct.server.ts
import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/utils/slug";
import type { CatalogItem } from "./model";

/**
 * Verifica si las variables de entorno de Supabase están presentes
 */
function hasSupabaseEnvs(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Obtiene un producto por sección y slug
 */
export async function getProductBySectionSlug(
  section: string,
  slug: string,
): Promise<CatalogItem | null> {
  if (!hasSupabaseEnvs()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs (using null)");
    }
    return null;
  }

  try {
    const supabase = createServerSupabase();
    const normalizedSlug = normalizeSlug(slug);
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .eq("section", section)
      .eq("product_slug", normalizedSlug)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id),
      product_slug: String(data.product_slug ?? ""),
      section: String(data.section),
      title: String(data.title),
      description: data.description ?? null,
      price_cents: data.price_cents ?? null,
      currency: data.currency ?? "mxn",
      stock_qty: data.stock_qty ?? null,
      image_url: data.image_url ?? null,
    } as CatalogItem;
  } catch (error) {
    console.warn("[getProductBySectionSlug] Error:", error);
    return null;
  }
}

/**
 * Obtiene un producto por slug (cualquier sección)
 */
export async function getProductBySlug(
  slug: string,
): Promise<CatalogItem | null> {
  if (!hasSupabaseEnvs()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[catalog] missing supabase envs (using null)");
    }
    return null;
  }

  try {
    const supabase = createServerSupabase();
    const normalizedSlug = normalizeSlug(slug);
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price_cents, currency, stock_qty, image_url",
      )
      .eq("product_slug", normalizedSlug)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: String(data.id),
      product_slug: String(data.product_slug ?? ""),
      section: String(data.section),
      title: String(data.title),
      description: data.description ?? null,
      price_cents: data.price_cents ?? null,
      currency: data.currency ?? "mxn",
      stock_qty: data.stock_qty ?? null,
      image_url: data.image_url ?? null,
    } as CatalogItem;
  } catch (error) {
    console.warn("[getProductBySlug] Error:", error);
    return null;
  }
}
