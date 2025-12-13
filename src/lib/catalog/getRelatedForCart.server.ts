import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type DbRow } from "./mapDbToProduct";
import { getFeaturedItems } from "./getFeatured.server";

export type ApiCatalogProduct = ReturnType<typeof mapDbToCatalogItem>;

/**
 * Obtiene productos relacionados basados en las secciones de los productos del carrito.
 * Si no hay suficientes productos relacionados, completa con productos destacados.
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
    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] No productIds provided");
    }
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
    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] Looking for related products for IDs:", productIds);
    }

    // 1. Obtener las secciones de los productos del carrito
    const { data: cartProducts, error: cartError } = await sb
      .from("api_catalog_with_images")
      .select("id, section")
      .in("id", productIds);

    if (cartError) {
      console.error("[getRelatedProductsForCart] Error al obtener secciones:", cartError);
      return [];
    }

    if (!cartProducts || cartProducts.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[getRelatedProductsForCart] No cart products found in DB for IDs:", productIds);
      }
      return [];
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] Found cart products:", cartProducts.length, "sections:", cartProducts.map(p => p.section));
    }

    // Extraer secciones únicas
    const sections = Array.from(
      new Set(cartProducts.map((p) => p.section).filter(Boolean)),
    ) as string[];

    if (sections.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[getRelatedProductsForCart] No valid sections found");
      }
      return [];
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] Searching in sections:", sections);
    }

    // 2. Buscar productos de las mismas secciones, excluyendo los del carrito
    // Obtener más productos para tener opciones después de filtrar los del carrito
    // Nota: La vista puede tener 'active' o 'is_active', filtramos después del mapeo
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("*")
      .in("section", sections)
      .order("price_cents", { ascending: true })
      .limit(limit * 3); // Obtener más para tener opciones después de filtrar

    if (error) {
      console.error("[getRelatedProductsForCart] Error al obtener productos relacionados:", error);
      return [];
    }

    if (!data || data.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[getRelatedProductsForCart] No products found in sections:", sections);
      }
      // Fallback: usar productos destacados
      return await getFallbackProducts(productIds, limit);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] Found", data.length, "products in sections before filtering");
    }

    // Filtrar productos que ya están en el carrito
    // Normalizar IDs a string para comparación (pueden venir como UUID o string)
    const productIdsSet = new Set(productIds.map(id => String(id)));
    const filteredData = data.filter((row) => {
      const rowId = String(row.id);
      return !productIdsSet.has(rowId);
    });

    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] After filtering cart items:", filteredData.length, "products remaining");
    }

    // 3. Mapear a formato canónico y filtrar solo activos
    const relatedProducts = filteredData
      .map((row) => mapDbToCatalogItem(row as DbRow))
      .filter((item) => item.is_active)
      .slice(0, limit);

    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] Final related products:", relatedProducts.length, "out of", limit, "requested");
    }

    // Si no hay suficientes productos relacionados, completar con destacados
    if (relatedProducts.length < limit) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[getRelatedProductsForCart] Only", relatedProducts.length, "related products, adding featured to reach", limit);
      }
      const featuredProducts = await getFallbackProducts(
        [...productIds, ...relatedProducts.map(p => p.id)],
        limit - relatedProducts.length,
      );
      return [...relatedProducts, ...featuredProducts];
    }

    return relatedProducts;
  } catch (error) {
    console.error("[getRelatedProductsForCart] Error inesperado:", error);
    // En caso de error, intentar fallback con destacados
    return await getFallbackProducts(productIds, limit);
  }
}

/**
 * Fallback: obtener productos destacados excluyendo los del carrito
 */
async function getFallbackProducts(
  excludeIds: string[],
  limit: number,
): Promise<ApiCatalogProduct[]> {
  try {
    const featuredItems = await getFeaturedItems();
    const excludeSet = new Set(excludeIds);
    
    const filtered = featuredItems
      .filter((item) => !excludeSet.has(item.product_id))
      .slice(0, limit)
      .map((item) => ({
        id: item.product_id,
        section: item.section,
        slug: item.product_slug,
        title: item.title,
        description: item.description ?? undefined,
        image_url: item.image_url ?? undefined,
        price: item.price_cents ? item.price_cents / 100 : 0,
        in_stock: item.in_stock ?? false,
        is_active: item.is_active ?? true,
      }));

    if (process.env.NODE_ENV !== "production") {
      console.log("[getRelatedProductsForCart] Fallback: returning", filtered.length, "featured products");
    }

    return filtered;
  } catch (error) {
    console.error("[getRelatedProductsForCart] Error en fallback:", error);
    return [];
  }
}

