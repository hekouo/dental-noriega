// src/app/api/products/all/route.ts
import { NextResponse } from "next/server";
import { listCatalog } from "@/lib/supabase/catalog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Endpoint para obtener todos los productos activos
 * Usado por /buscar para filtrar en cliente
 */
export async function GET() {
  try {
    // Obtener todos los productos activos
    const products = await listCatalog();

    // Mapear al formato esperado por /buscar
    const mapped = products.map((item) => ({
      id: String(item.id),
      section: String(item.section),
      product_slug: String(item.product_slug),
      title: String(item.title),
      price_cents: Number(item.price_cents),
      image_url: item.image_url ?? null,
      in_stock: item.in_stock ?? null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("[API /products/all] Error:", error);
    return NextResponse.json(
      { error: "Error al cargar productos" },
      { status: 500 },
    );
  }
}
