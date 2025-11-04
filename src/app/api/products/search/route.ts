// src/app/api/products/search/route.ts
import { NextResponse } from "next/server";
import { getAllFromCatalog } from "@/lib/catalog/getAllFromCatalog.server";
import { tokenize, normalize, scoreMatch } from "@/lib/search/normalize";

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

    const filtered = all
      .filter((it) => {
        const tTitle = normalize(it.title);
        const tSlug = normalize(it.product_slug ?? "");
        // (opcional) section también ayuda
        const tSec = normalize(it.section ?? "");
        return tokens.every(
          (tk) =>
            tTitle.includes(tk) || tSlug.includes(tk) || tSec.includes(tk),
        );
      })
      .map((it) => ({
        it,
        sc: scoreMatch(it as any, tokens),
      }))
      .sort((a, b) => b.sc - a.sc)
      .map(({ it }) => it);

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const items = filtered.slice(start, start + perPage);

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

