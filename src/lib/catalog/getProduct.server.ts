import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type DbRow } from "./mapDbToProduct";

export async function getProduct(
  section: string,
  slug: string,
): Promise<ReturnType<typeof mapDbToCatalogItem> | null> {
  noStore();
  const sb = createClient();

  // 1) Intentar obtener el producto desde la vista canónica
  //    api_catalog_with_images (section + slug)
  const { data, error } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("section", section)
    .eq("product_slug", slug)
    .maybeSingle();

  if (!error && data) {
    const item = mapDbToCatalogItem(data as DbRow);
    // Regla de negocio: si no está activo, tratar como no disponible
    if (!item.is_active) return null;
    return item;
  }

  // 2) Fallback: buscar por slug en cualquier sección dentro de la vista
  const { data: dataBySlug, error: errorBySlug } = await sb
    .from("api_catalog_with_images")
    .select("*")
    .eq("product_slug", slug)
    .maybeSingle();

  if (!errorBySlug && dataBySlug) {
    const item = mapDbToCatalogItem(dataBySlug as DbRow);
    if (!item.is_active) return null;
    return item;
  }

  // 3) Fallback final: leer directamente desde public.products + public.sections
  //    para cubrir productos nuevos creados desde el panel admin que aún
  //    no aparecen en la vista api_catalog_with_images.
  try {
    const { data: productRow, error: productError } = await sb
      .from("products")
      .select(
        `
        id,
        slug,
        title,
        description,
        image_url,
        price_cents,
        price,
        stock_qty,
        active,
        sections!inner(slug)
      `,
      )
      .eq("slug", slug)
      .eq("sections.slug", section)
      .maybeSingle();

    if (productError || !productRow) {
      if (process.env.NODE_ENV !== "production" && productError) {
        console.error("[getProduct] Fallback products error:", productError);
      }
      return null;
    }

    const sectionSlug =
      // @ts-expect-error — relación dinámica de Supabase
      productRow.sections?.slug ?? section;

    const fallbackRow: DbRow = {
      id: productRow.id,
      section: sectionSlug,
      product_slug: productRow.slug,
      title: productRow.title ?? null,
      description: productRow.description ?? null,
      image_url: productRow.image_url ?? null,
      price_cents:
        typeof productRow.price_cents === "number"
          ? productRow.price_cents
          : // Fallback muy defensivo por si hubiera price numérico
            typeof productRow.price === "number"
            ? Math.round(productRow.price * 100)
            : 0,
      price:
        typeof productRow.price === "number" ? productRow.price : undefined,
      in_stock:
        typeof productRow.stock_qty === "number"
          ? productRow.stock_qty > 0
          : null,
      stock_qty:
        typeof productRow.stock_qty === "number"
          ? productRow.stock_qty
          : null,
      is_active:
        typeof productRow.active === "boolean" ? productRow.active : null,
      active:
        typeof productRow.active === "boolean" ? productRow.active : null,
    };

    const item = mapDbToCatalogItem(fallbackRow);
    if (!item.is_active) return null;
    return item;
  } catch (fallbackError) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[getProduct] Unexpected fallback error:", fallbackError);
    }
    return null;
  }
}
