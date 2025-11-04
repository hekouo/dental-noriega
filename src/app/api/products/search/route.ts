// src/app/api/products/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllFromView } from "@/lib/catalog/getAllFromView.server";
import { normalize, tokenize, scoreMatch } from "@/lib/search/normalize";

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const perPage = 20;

  // Si q vacío, devolver vacío
  if (!q || q.length === 0) {
    return NextResponse.json<SearchResponse>({
      items: [],
      total: 0,
      page: 1,
      perPage,
    });
  }

  try {
    // Obtener todos los items
    const allItems = await getAllFromView();

    // Normalizar y tokenizar query
    const tokens = tokenize(q);
    if (tokens.length === 0) {
      return NextResponse.json<SearchResponse>({
        items: [],
        total: 0,
        page: 1,
        perPage,
      });
    }

    // Filtrar: todos los tokens deben aparecer en normalize(title) || normalize(product_slug)
    const filteredItems = allItems.filter((item) => {
      const normTitle = normalize(item.title);
      const normSlug = normalize(item.product_slug);
      const normSection = normalize(item.section);

      // Verificar que todos los tokens aparezcan en al menos un campo
      return tokens.every(
        (token) =>
          normTitle.includes(token) ||
          normSlug.includes(token) ||
          normSection.includes(token),
      );
    });

    // Ordenar por score desc
    const scoredItems = filteredItems
      .map((item) => ({
        item,
        score: scoreMatch(
          {
            title: item.title,
            product_slug: item.product_slug,
            section: item.section,
          },
          tokens,
        ),
      }))
      .filter((x) => x.score > 0) // Solo items con score > 0
      .sort((a, b) => b.score - a.score) // Desc
      .map((x) => x.item);

    // Paginado
    const offset = (page - 1) * perPage;
    const paginatedItems = scoredItems.slice(offset, offset + perPage);

    // Responder con formato simplificado
    return NextResponse.json<SearchResponse>({
      items: paginatedItems.map((item) => ({
        id: item.id,
        product_slug: item.product_slug,
        section: item.section,
        title: item.title,
        price: item.price,
        image_url: item.image_url,
      })),
      total: scoredItems.length,
      page,
      perPage,
    });
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

