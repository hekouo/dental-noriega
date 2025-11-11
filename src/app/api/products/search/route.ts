// src/app/api/products/search/route.ts
import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "@/lib/catalog/mapDbToProduct";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchResponse = {
  items: Array<{
    id: string;
    product_slug: string;
    section: string;
    title: string;
    price: number;
    price_cents: number;
    image_url: string | null;
    in_stock: boolean;
    is_active: boolean;
  }>;
  total: number;
  page: number;
  perPage: number;
};

export async function GET(req: Request) {
  noStore();
  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") || "";
  const q = qRaw.trim().toLowerCase();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = 20;

  if (!q) {
    return NextResponse.json({ items: [], total: 0, page: 1, perPage });
  }

  try {
    const sb = createClient();
    
    // Buscar en api_catalog_with_images con ilike sobre title, product_slug y section
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("*")
      .or(`title.ilike.%${q}%,product_slug.ilike.%${q}%,section.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[search] Supabase error:", error);
      return NextResponse.json<SearchResponse>(
        {
          items: [],
          total: 0,
          page: 1,
          perPage,
        },
        { status: 500 },
      );
    }

    // Mapear resultados usando mapDbToCatalogItem
    const mapped = (data ?? []).map(mapDbToCatalogItem);

    const total = mapped.length;
    const start = (page - 1) * perPage;
    const items = mapped.slice(start, start + perPage).map((it) => ({
      id: it.id,
      product_slug: it.slug,
      section: it.section,
      title: it.title,
      price: it.price,
      image_url: it.image_url ?? null,
    }));

    return NextResponse.json({ items, total, page, perPage });
  } catch (error) {
    console.error("[search] Error:", error);
    return NextResponse.json<SearchResponse>(
      {
        items: [],
        total: 0,
        page: 1,
        perPage,
      },
      { status: 500 },
    );
  }
}
