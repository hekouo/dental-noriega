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

export async function GET(
  _request: Request,
  { params }: { params: { section: string } }
) {
  noStore();
  const supa = getPublicSupabase();
  const section = decodeURIComponent(params.section ?? "");

  try {
    // Obtener todos los productos de la sección usando select("*") para evitar problemas con columnas
    const { data, error } = await supa
      .from("api_catalog_with_images")
      .select("*")
      .eq("section", section)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(50);
    
    if (!error && data && data.length > 0) {
      dbg(`[debug/section] Columnas disponibles en primer item:`, Object.keys(data[0]));
    }

    // Obtener conteos para debug (siempre incluirlos en endpoints de debug)
    // Usar select("*") para evitar problemas con columnas que no existen
    const { count: totalInSection } = await supa
      .from("api_catalog_with_images")
      .select("*", { count: "exact", head: true })
      .eq("section", section);
    
    const { count: activeInSection } = await supa
      .from("api_catalog_with_images")
      .select("*", { count: "exact", head: true })
      .eq("section", section)
      .eq("active", true);
    
    // Intentar conteo con in_stock, si falla omitir
    let stockInSection: number | null = null;
    try {
      const { count } = await supa
        .from("api_catalog_with_images")
        .select("*", { count: "exact", head: true })
        .eq("section", section)
        .eq("active", true)
        .eq("in_stock", true);
      stockInSection = count ?? 0;
    } catch (e) {
      dbg(`[debug/section] Error al contar con in_stock:`, e);
      stockInSection = null;
    }

    if (error) {
      dbg(`[debug/section] Error para sección '${section}':`, error);
      return NextResponse.json({
        section,
        error: error.message,
        rawCount: 0,
        mappedCount: 0,
        sampleRaw: null,
        sampleMapped: null,
        debug: {
          totalInSection: totalInSection ?? 0,
          activeInSection: activeInSection ?? 0,
          stockInSection: stockInSection ?? null,
          dataLength: (data as unknown[] | null)?.length ?? 0,
          filteredLength: 0,
        },
      });
    }

    // Filtrar en memoria: activos y en stock
    const products: Product[] = (data ?? []).map((r: any) => mapRow(r));
    const filteredProducts = products.filter((p) => p.active && p.inStock);
    // Ordenar por slug alfabéticamente después de mapear
    filteredProducts.sort((a, b) => a.slug.localeCompare(b.slug));
    const filteredData = filteredProducts.slice(0, 12);

    const rawCount = filteredData.length;
    let mappedCount = 0;
    let sampleRaw: unknown = null;
    let sampleMapped: CatalogItem | null = null;

    if (filteredData.length > 0) {
      // Convertir a CatalogItem
      const catalogItems: CatalogItem[] = filteredData.map((p) => ({
        id: p.id,
        product_slug: p.slug,
        section: p.section,
        title: p.title,
        description: p.description ?? null,
        price_cents: Math.round(p.price * 100),
        currency: "mxn",
        // eslint-disable-next-line no-restricted-syntax
        image_url: p.imageUrl ?? null, // Product usa imageUrl, CatalogItem usa image_url
        in_stock: p.inStock && p.active,
        is_active: p.active ?? true,
      }));

      mappedCount = catalogItems.length;
      sampleRaw = filteredData[0];
      sampleMapped = catalogItems[0] ?? null;
    }

    return NextResponse.json({
      section,
      rawCount,
      mappedCount,
      sampleRaw,
      sampleMapped,
        debug: {
          totalInSection: totalInSection ?? 0,
          activeInSection: activeInSection ?? 0,
          stockInSection: stockInSection ?? null,
          dataLength: data?.length ?? 0,
          filteredLength: filteredData.length,
        },
    });
  } catch (error) {
    dbg(`[debug/section] Error para sección '${section}':`, error);
    return NextResponse.json(
      {
        section,
        error: "Internal server error",
        rawCount: 0,
        mappedCount: 0,
      },
      { status: 500 }
    );
  }
}
