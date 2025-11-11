import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { getPublicSupabase } from "@/lib/supabase/public";
import { mapDbToCatalogItem } from "@/lib/catalog/mapDbToProduct";

export const dynamic = "force-dynamic";

export async function GET() {
  noStore();
  const sb = getPublicSupabase();

  try {
    // ¿Hay filas en featured?
    const { data: featRows, error: featErr } = await sb
      .from("featured")
      .select("position, product_id")
      .order("position", { ascending: true, nullsFirst: true })
      .limit(12);

    const fromFeatured = !featErr && featRows && featRows.length > 0;

    let items: ReturnType<typeof mapDbToCatalogItem>[] = [];

    if (fromFeatured) {
      const ids = featRows!.map((f) => f.product_id);
      const { data, error } = await sb
        .from("api_catalog_with_images")
        .select("*")
        .in("id", ids);

      if (error) throw error;
      const map = new Map(data!.map((r) => [r.id, r]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean);
      items = ordered.map(mapDbToCatalogItem);
    } else {
      // Fallback solo si *no hay* filas en featured
      const { data, error } = await sb
        .from("api_catalog_with_images")
        .select("*")
        .eq("is_active", true)
        .eq("in_stock", true)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      items = (data ?? []).map(mapDbToCatalogItem);
    }

    return NextResponse.json({
      fromFeatured,
      count: items.length,
      sample: items[0] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: String(error), fromFeatured: false, count: 0, sample: null },
      { status: 500 },
    );
  }
}
