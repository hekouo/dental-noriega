import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SuggestItem = {
  id: string;
  title: string;
  slug: string;
  section_slug: string;
  image_url: string | null;
  price_cents: number | null;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qRaw = url.searchParams.get("q") || "";
  const q = qRaw.trim().toLowerCase();

  // Validar: mínimo 2 caracteres
  if (q.length < 2) {
    return NextResponse.json<SuggestItem[]>([]);
  }

  try {
    const sb = createClient();

    // Buscar en api_catalog_with_images (mismo patrón que /api/products/search)
    const { data, error } = await sb
      .from("api_catalog_with_images")
      .select("id, section, product_slug, title, image_url, price_cents")
      .or(`title.ilike.%${q}%,product_slug.ilike.%${q}%,section.ilike.%${q}%`)
      .eq("is_active", true)
      .eq("in_stock", true) // Solo productos en stock para sugerencias
      .order("title", { ascending: true })
      .limit(8);

    if (error) {
      console.error("[suggest] Supabase error:", error);
      return NextResponse.json<SuggestItem[]>([]);
    }

    const items: SuggestItem[] = (data ?? []).map((item) => ({
      id: String(item.id),
      title: String(item.title),
      slug: String(item.product_slug),
      section_slug: String(item.section),
      image_url: item.image_url ?? null,
      price_cents: item.price_cents ? Number(item.price_cents) : null,
    }));

    // Ranking ligero: reordenar por relevancia
    const ranked = items.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const qLower = q.toLowerCase();

      // 1) title startsWith(q) tiene prioridad
      const aStartsWith = aTitle.startsWith(qLower);
      const bStartsWith = bTitle.startsWith(qLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      // 2) title includes(q) tiene prioridad sobre otros
      const aIncludes = aTitle.includes(qLower);
      const bIncludes = bTitle.includes(qLower);
      if (aIncludes && !bIncludes) return -1;
      if (!aIncludes && bIncludes) return 1;

      // 3) Fallback: orden alfabético estable
      return aTitle.localeCompare(bTitle);
    });

    return NextResponse.json<SuggestItem[]>(ranked, {
      headers: {
        "Cache-Control": "public, max-age=30",
      },
    });
  } catch (error) {
    console.error("[suggest] Error:", error);
    return NextResponse.json<SuggestItem[]>([]);
  }
}

