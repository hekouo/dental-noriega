// src/app/api/products/search/route.ts
import { NextResponse } from "next/server";
import { getAllFromCatalog } from "@/lib/catalog/getAllFromCatalog.server";
import { tokenize, scoreMatch, type SearchableItem } from "@/lib/search/normalize";
import { toNumberSafe } from "@/lib/utils/money";

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
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const perPage = 20;

  if (!q) {
    return NextResponse.json({ items: [], total: 0, page: 1, perPage });
  }

  try {
    const tokens = tokenize(q);
    const all = await getAllFromCatalog();
    const { getMatchType } = await import("@/lib/search/normalize");

    // Convertir items a SearchableItem para las funciones de matching
    const searchableItems: SearchableItem[] = all.map((it) => ({
      title: it.title,
      product_slug: it.product_slug ?? "",
      section: it.section ?? "",
    }));

    const filtered = all
      .map((it, idx) => {
        const searchable = searchableItems[idx];
        const match = getMatchType(searchable, q);
        const tokenScore = scoreMatch(searchable, tokens);
        return {
          it,
          matchType: match.type,
          score: match.score + tokenScore,
        };
      })
      .sort((a, b) => {
        // Ordenar por tipo de match primero (exact > beginsWith > contains)
        const typeOrder: Record<string, number> = {
          exact: 3,
          beginsWith: 2,
          contains: 1,
        };
        const typeDiff = typeOrder[b.matchType] - typeOrder[a.matchType];
        if (typeDiff !== 0) return typeDiff;
        // Luego por score
        return b.score - a.score;
      })
      .map(({ it }) => it);

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const items = filtered.slice(start, start + perPage).map((it) => ({
      id: it.id,
      product_slug: it.product_slug,
      section: it.section,
      title: it.title,
      price:
        toNumberSafe(
          (it as { price?: number }).price ??
            (it.price_cents ? it.price_cents / 100 : 0),
        ) ?? 0,
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
