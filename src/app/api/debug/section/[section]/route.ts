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
    // Obtener todos los productos de la sección sin filtrar por active, luego filtrar en memoria
    // Intentar primero con in_stock, si falla intentar sin especificar columnas de stock
    let { data, error } = await supa
      .from("api_catalog_with_images")
      .select(
        "id, product_slug, section, title, description, price, image_url, in_stock, active"
      )
      .eq("section", section)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(50);
    
    // Si falla con in_stock, intentar sin especificar columnas de stock
    if (error && error.message.includes("does not exist")) {
      dbg(`[debug/section] Error con in_stock, intentando sin columnas de stock:`, error.message);
      const result = await supa
        .from("api_catalog_with_images")
        .select("*")
        .eq("section", section)
        .order("created_at", { ascending: false, nullsFirst: false })
        .limit(50);
      data = result.data;
      error = result.error;
      if (!error && data && data.length > 0) {
        dbg(`[debug/section] Columnas disponibles en primer item:`, Object.keys(data[0]));
      }
    }

    // Obtener conteos para debug (siempre incluirlos en endpoints de debug)
    const { count: totalInSection } = await supa
      .from("api_catalog_with_images")
      .select("*", { count: "exact", head: true })
      .eq("section", section);
    
    const { count: activeInSection } = await supa
      .from("api_catalog_with_images")
      .select("*", { count: "exact", head: true })
      .eq("section", section)
      .eq("active", true);
    
    const { count: stockInSection } = await supa
      .from("api_catalog_with_images")
      .select("*", { count: "exact", head: true })
      .eq("section", section)
      .eq("active", true)
      .eq("in_stock", true);

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
          stockInSection: stockInSection ?? 0,
          queryError: error.message,
        },
      });
    }

    // Incluir todos los productos sin filtrar por active
    const filteredData = (data ?? []).slice(0, 12);

    const rawCount = filteredData.length;
    let mappedCount = 0;
    let sampleRaw: unknown = null;
    let sampleMapped: CatalogItem | null = null;

    if (filteredData.length > 0) {
      // Mapear con mapRow y convertir a CatalogItem
      const products: Product[] = filteredData.map((r: any) => mapRow(r));
      // Ordenar por slug alfabéticamente después de mapear
      products.sort((a, b) => a.slug.localeCompare(b.slug));
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
        stockInSection: stockInSection ?? 0,
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
