// src/app/api/products/search/route.ts
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "@/lib/catalog/mapDbToProduct";
import { CATALOG_PAGE_SIZE, calculateOffset, hasNextPage as calculateHasNextPage, normalizeSortParam } from "@/lib/catalog/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchResponse = {
  items: Array<{
    id: string;
    product_slug: string;
    section: string;
    title: string;
    price: number;
    image_url: string | null;
  }>;
  total: number;
  page: number;
  perPage: number;
  hasNextPage: boolean;
};

export async function GET(req: Request) {
  noStore();
  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") || "";
  const q = qRaw.trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const sort = normalizeSortParam(url.searchParams.get("sort"));
  const perPage = CATALOG_PAGE_SIZE;

  if (!q) {
    return NextResponse.json({ items: [], total: 0, page: 1, perPage, hasNextPage: false });
  }

  try {
    const sb = createClient();
    
    const offset = calculateOffset(page, perPage);
    
    // Buscar en api_catalog_with_images con ilike sobre title, product_slug y section
    // Usar un OR en una sola cadena .or() para Supabase
    // Aplicar paginación directamente en Supabase con .range()
    let query = sb
      .from("api_catalog_with_images")
      .select("*", { count: "exact" })
      .or(`title.ilike.%${q}%,product_slug.ilike.%${q}%,section.ilike.%${q}%`)
      .eq("is_active", true)
      .eq("in_stock", true);

    // Aplicar ordenamiento según la opción seleccionada
    switch (sort) {
      case "price_asc":
        query = query.order("price_cents", { ascending: true });
        break;
      case "price_desc":
        query = query.order("price_cents", { ascending: false });
        break;
      case "name_asc":
        query = query.order("title", { ascending: true });
        break;
      case "relevance":
      default:
        // Orden por defecto (más recientes primero)
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data, error, count } = await query.range(offset, offset + perPage - 1);

    if (error) {
      console.error("[search] Supabase error:", error);
      return NextResponse.json<SearchResponse>(
        {
          items: [],
          total: 0,
          page: 1,
          perPage,
          hasNextPage: false,
        },
        { status: 500 },
      );
    }

    // Mapear resultados usando el adaptador
    const mapped = (data ?? []).map(mapDbToCatalogItem);

    const items = mapped.map((it) => ({
      id: it.id,
      product_slug: it.slug,
      section: it.section,
      title: it.title,
      price: it.price,
      image_url: it.image_url ?? null,
    }));

    const total = count ?? items.length;
    const calculatedHasNextPage = calculateHasNextPage(items.length, perPage);

    return NextResponse.json({ items, total, page, perPage, hasNextPage: calculatedHasNextPage });
  } catch (error) {
    console.error("[search] Error:", error);
    return NextResponse.json<SearchResponse>(
      {
        items: [],
        total: 0,
        page: 1,
        perPage,
        hasNextPage: false,
      },
      { status: 500 },
    );
  }
}
