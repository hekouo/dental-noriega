// src/app/api/products/by-section/route.ts
import { NextResponse } from "next/server";
import { getProductsBySectionFromView } from "@/lib/catalog/getProductsBySectionFromView.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Response = {
  items: Array<{
    id: string;
    section: string;
    product_slug: string;
    title: string;
    price_cents: number;
    image_url: string | null;
  }>;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const section = url.searchParams.get("section") || "consumibles-y-profilaxis";
  const excludeSlug = url.searchParams.get("excludeSlug") || "";
  const limit = Math.min(
    20,
    parseInt(url.searchParams.get("limit") || "4", 10),
  );

  try {
    const products = await getProductsBySectionFromView(section, limit + 1, 0);

    // Filtrar el slug excluido y tomar hasta `limit`
    const filtered = products
      .filter((p) => p.product_slug !== excludeSlug)
      .slice(0, limit)
      .map((p) => ({
        id: p.id,
        section: p.section,
        product_slug: p.product_slug,
        title: p.title,
        price_cents: p.price_cents,
        image_url: p.image_url ?? null,
      }));

    return NextResponse.json<Response>({ items: filtered });
  } catch (error) {
    console.error("[by-section] Error:", error);
    // Nunca devolver 500, siempre 200 con items vacío
    return NextResponse.json<Response>({ items: [] });
  }
}
