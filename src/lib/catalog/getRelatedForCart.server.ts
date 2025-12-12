import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type DbRow } from "./mapDbToProduct";

export type ApiCatalogProduct = ReturnType<typeof mapDbToCatalogItem>;

/**
 * Obtiene productos relacionados basados en las secciones de los productos del carrito.
 * 
 * @param productIds - IDs de los productos que ya están en el carrito (para excluirlos)
 * @param limit - Número máximo de productos a devolver (default: 8)
 * @returns Array de productos relacionados de las mismas secciones
 */
export async function getRelatedProductsForCart(
  productIds: string[],
  limit: number = 8,
): Promise<ApiCatalogProduct[]> {
  noStore();
  
  // Si no hay productos en el carrito, no hay secciones para buscar
  if (!productIds || productIds.length === 0) {
    return [];
  }

  const sb = createClient();
  if (!sb) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getRelatedProductsForCart] missing supabase envs");
    }
    return [];
  }

  try {
    // 1. Obtener las secciones de los productos del carrito
    // La vista puede tener 'active' o 'is_active'
    const { data: cartProducts, error: cartError } = await sb
      .from("api_catalog_with_images")
      .select("section")
      .in("id", productIds);

    if (cartError) {
      console.error("[getRelatedProductsForCart] Error al obtener secciones:", cartError);
      return [];
    }

    if (!cartProducts || cartProducts.length === 0) {
      return [];
    }

    // Extraer secciones únicas
    const sections = Array.from(
      new Set(cartProducts.map((p) => p.section).filter(Boolean)),
    ) as string[];

    if (sections.length === 0) {
      return [];
    }

    // 2. Buscar productos de las mismas secciones, excluyendo los del carrito
    // Obtener más productos para tener opciones después de filtrar los del carrito
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("*")
      .in("section", sections)
      .eq("active", true)
      .order("price_cents", { ascending: true })
      .limit(limit * 2); // Obtener más para tener opciones después de filtrar

    if (error) {
      console.error("[getRelatedProductsForCart] Error al obtener productos relacionados:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filtrar productos que ya están en el carrito
    const productIdsSet = new Set(productIds);
    const filteredData = data.filter((row) => !productIdsSet.has(row.id)).slice(0, limit);

    if (error) {
      console.error("[getRelatedProductsForCart] Error al obtener productos relacionados:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 3. Mapear a formato canónico y filtrar solo activos
    return filteredData
      .map((row) => mapDbToCatalogItem(row as DbRow))
      .filter((item) => item.is_active);
  } catch (error) {
    console.error("[getRelatedProductsForCart] Error inesperado:", error);
    return [];
  }
}

