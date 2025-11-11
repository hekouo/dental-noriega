import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapDbToCatalogItem, type CatalogItem } from "@/lib/catalog/mapDbToProduct";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  const sb = getPublicSupabase();

  try {
    // Verificar si hay filas en featured
    const { data: featRows, error: featErr } = await sb
      .from("featured")
      .select("position, product_id")
      .order("position", { ascending: true, nullsFirst: true })
      .limit(12);

    let fromFeatured = false;
    let items: CatalogItem[] = [];

    if (!featErr && featRows && featRows.length > 0) {
      fromFeatured = true;
      const ids = featRows.map((f) => f.product_id);
      const { data, error } = await sb
        .from("api_catalog_with_images")
        .select("*")
        .in("id", ids);

      if (!error && data) {
        const map = new Map((data ?? []).map((r) => [r.id, r]));
        const ordered = ids
          .map((id) => map.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item));

        items = ordered.map(mapDbToCatalogItem);
      }
    } else {
      // Fallback
      const { data, error } = await sb
        .from("api_catalog_with_images")
        .select("*")
        .eq("is_active", true)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!error && data) {
        items = (data ?? []).map(mapDbToCatalogItem);
      }
    }

    return NextResponse.json({
      fromFeatured,
      count: items.length,
      sample: items[0] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        fromFeatured: false,
        count: 0,
        sample: null,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
