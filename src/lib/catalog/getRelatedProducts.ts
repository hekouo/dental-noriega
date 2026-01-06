import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { CatalogItem } from "./model";

type ApiCatalogRow = {
  id: string | number;
  product_slug: string | null;
  section: string | null;
  title: string | null;
  description?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  image_url?: string | null;
  in_stock?: boolean | null;
  stock_qty?: number | null;
  is_active?: boolean | null;
  active?: boolean | null;
  normalized_title?: string | null;
};

type GetRelatedProductsParams = {
  currentId: string;
  sectionSlug: string;
  limit?: number;
};

/**
 * Obtiene productos relacionados del mismo section con ranking simple:
 * 1. stock_qty > 0 primero (o stock_qty desc)
 * 2. updated_at desc si está disponible
 * 3. fallback: title asc
 * 
 * Excluye el producto actual y solo muestra productos activos.
 */
export async function getRelatedProducts({
  currentId,
  sectionSlug,
  limit = 8,
}: GetRelatedProductsParams): Promise<CatalogItem[]> {
  const supabase = createServerSupabase();

  try {
    // Query ligera: obtener productos del mismo section, activos, excluyendo el actual
    // Seleccionar columnas necesarias para ranking (stock_qty, normalized_title)
    const { data, error } = await supabase
      .from("api_catalog_with_images")
      .select("id, product_slug, section, title, description, price_cents, currency, image_url, in_stock, stock_qty, active, normalized_title")
      .eq("section", sectionSlug)
      .eq("active", true)
      .neq("id", currentId)
      .limit(limit * 2); // Obtener más para poder hacer ranking en memoria

    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getRelatedProducts] Error:", error.message);
      }
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Ranking en memoria:
    // 1. stock_qty > 0 primero (o stock_qty desc)
    // 2. title asc como fallback estable
    const ranked = (data as ApiCatalogRow[]).sort((a, b) => {
      const aStock = a.stock_qty ?? 0;
      const bStock = b.stock_qty ?? 0;

      // Priorizar productos con stock
      if (aStock > 0 && bStock <= 0) return -1;
      if (aStock <= 0 && bStock > 0) return 1;

      // Si ambos tienen stock o ambos no tienen, ordenar por stock_qty desc
      if (aStock !== bStock) {
        return bStock - aStock;
      }

      // Fallback: ordenar alfabéticamente por título
      const aTitle = (a.normalized_title ?? a.title ?? "").toLowerCase();
      const bTitle = (b.normalized_title ?? b.title ?? "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });

    // Tomar solo el límite solicitado
    const limited = ranked.slice(0, limit);

    // Mapear a CatalogItem
    return limited.map((item: ApiCatalogRow) => ({
      id: String(item.id),
      product_slug: String(item.product_slug ?? ""),
      section: String(item.section ?? sectionSlug),
      title: String(item.title ?? ""),
      description: item.description ?? null,
      price_cents: item.price_cents ?? null,
      currency: item.currency ?? "mxn",
      image_url: item.image_url ?? null,
      in_stock: item.in_stock ?? null,
      is_active: item.is_active ?? item.active ?? null,
    })) as CatalogItem[];
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getRelatedProducts] Error:", error);
    }
    return [];
  }
}

