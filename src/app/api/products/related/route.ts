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
      if (process.env.NODE_ENV !== "production") {
        console.log("[api/products/related] No productIds param provided");
      }
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    const productIds = productIdsParam.split(",").filter(Boolean);
    const limit = limitParam ? parseInt(limitParam, 10) : 8;

    if (productIds.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[api/products/related] Empty productIds array after parsing");
      }
      return NextResponse.json({ products: [] }, { status: 200 });
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[api/products/related] Fetching related products for:", productIds, "limit:", limit);
    }

    let products = await getRelatedProductsForCart(productIds, limit);

    // Si no hay productos, el helper debería haber usado fallback, pero por seguridad
    // intentamos una vez más con destacados directamente
    if (products.length === 0) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[api/products/related] No products from helper, attempting direct fallback");
      }
      try {
        const { getFeaturedItems } = await import("@/lib/catalog/getFeatured.server");
        const featuredItems = await getFeaturedItems();
        const excludeSet = new Set(productIds.map(id => String(id)));
        
        products = featuredItems
          .filter((item) => !excludeSet.has(String(item.product_id)))
          .slice(0, limit)
          .map((item) => ({
            id: item.product_id,
            section: item.section,
            slug: item.product_slug,
            title: item.title,
            description: item.description ?? undefined,
            image_url: item.image_url ?? undefined,
            price: item.price_cents ? item.price_cents / 100 : 0,
            in_stock: item.in_stock ?? false,
            is_active: item.is_active ?? true,
          }));
      } catch (fallbackError) {
        console.error("[api/products/related] Fallback also failed:", fallbackError);
        // Retornar array vacío si todo falla (mejor que error 500)
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[api/products/related] Returning", products.length, "products");
    }

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
