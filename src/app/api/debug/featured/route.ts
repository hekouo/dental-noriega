import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapRow, Product } from "@/lib/catalog/mapDbToProduct";
import type { CatalogItem } from "@/lib/catalog/model";

// Helper para logs de debug solo en desarrollo
const dbg = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  const supa = getPublicSupabase();

  try {
    // Intentar destacados por slugs
    const { data: featuredData } = await supa
      .from("featured")
      .select("product_slug")
      .order("position", { ascending: true });

    let rawData: unknown[] = [];
    let rawCount = 0;
    let mappedCount = 0;
    let sampleRaw: unknown = null;
    let sampleMapped: CatalogItem | null = null;

    if (featuredData && featuredData.length > 0) {
      const slugs = featuredData.map((x) => x.product_slug);
      const { data, error } = await supa
        .from("api_catalog_with_images")
        .select(
          "id, product_slug, section, title, description, price, image_url, stock_qty, active"
        )
        .in("product_slug", slugs);

      if (!error && data) {
        rawData = data;
        rawCount = data.length;
      }
    }

    // Si 0, ejecutar fallback
    if (rawCount === 0) {
      dbg("[debug/featured] Usando fallback: 12 más recientes activos y en stock");
      // Primero verificar si hay productos sin filtros
      const { count: totalCount } = await supa
        .from("api_catalog_with_images")
        .select("*", { count: "exact", head: true });
      
      const { count: activeCount } = await supa
        .from("api_catalog_with_images")
        .select("*", { count: "exact", head: true })
        .eq("active", true);
      
      const { count: stockCount } = await supa
        .from("api_catalog_with_images")
        .select("*", { count: "exact", head: true })
        .eq("active", true)
        .gt("stock_qty", 0);

      // Fallback: obtener todos los productos sin filtrar por active, luego filtrar en memoria
      const { data: fallbackData, error: fallbackError } = await supa
        .from("api_catalog_with_images")
        .select(
          "id, product_slug, section, title, description, price, image_url, stock_qty, active"
        )
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(50);

      if (!fallbackError && fallbackData) {
        // Filtrar: primero intentar active=null o true, si no hay ninguno, incluir todos
        let filteredFallback = fallbackData.filter(
          (item: any) => item.active === null || item.active === true
        );
        
        // Si no hay productos activos, incluir todos (incluso active=false)
        if (filteredFallback.length === 0) {
          filteredFallback = fallbackData;
        }
        
        filteredFallback = filteredFallback.slice(0, 12);
        
        rawData = filteredFallback;
        rawCount = filteredFallback.length;
        dbg(`[debug/featured] Fallback devolvió ${rawCount} productos`);
      } else {
        dbg("[debug/featured] Fallback error:", fallbackError);
      }
    }

    // Mapear con mapRow y convertir a CatalogItem
    const products: Product[] = rawData.map((r: any) => mapRow(r));
    const catalogItems: CatalogItem[] = products
      .filter((p) => p.inStock)
      .map((p) => ({
        id: p.id,
        product_slug: p.slug,
        section: p.section,
        title: p.title,
        description: p.description ?? null,
        price_cents: Math.round(p.price * 100),
        currency: "mxn",
        stock_qty: p.inStock ? 1 : 0,
        // eslint-disable-next-line no-restricted-syntax
        image_url: p.imageUrl ?? null, // Product usa imageUrl, CatalogItem usa image_url
        in_stock: p.active && p.inStock,
      }));

    mappedCount = catalogItems.length;

    if (rawData.length > 0) {
      sampleRaw = rawData[0];
      sampleMapped = catalogItems[0];
    }

    return NextResponse.json({
      rawCount,
      mappedCount,
      sampleRaw,
      sampleMapped,
      // Debug adicional: incluir conteos si están disponibles
      debug: process.env.NODE_ENV !== "production" ? {
        featuredCount: featuredData?.length ?? 0,
        hasFallback: rawCount === 0 && featuredData?.length === 0,
      } : undefined,
    });
  } catch (error) {
    dbg("[debug/featured] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", rawCount: 0, mappedCount: 0 },
      { status: 500 }
    );
  }
}

