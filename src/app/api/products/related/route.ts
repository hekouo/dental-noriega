import { NextRequest, NextResponse } from "next/server";
import { getRelatedProductsForCart } from "@/lib/catalog/getRelatedForCart.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const productIdsParam = searchParams.get("productIds");
    const limitParam = searchParams.get("limit");

    if (!productIdsParam) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    const productIds = productIdsParam.split(",").filter(Boolean);
    const limit = limitParam ? parseInt(limitParam, 10) : 8;

    if (productIds.length === 0) {
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    const products = await getRelatedProductsForCart(productIds, limit);

    return NextResponse.json(
      {
        products: products.map((p) => ({
          id: p.id,
          section: p.section,
          product_slug: p.slug,
          title: p.title,
          price_cents: Math.round(p.price * 100),
          image_url: p.image_url,
          in_stock: p.in_stock,
          is_active: p.is_active,
          description: p.description,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[api/products/related] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener productos relacionados" },
      { status: 500 },
    );
  }
}

