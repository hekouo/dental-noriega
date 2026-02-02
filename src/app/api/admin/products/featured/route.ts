import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FeaturedPostSchema = z.object({
  productSlug: z.string().min(1, "El slug del producto es requerido"),
  position: z.number().int().min(0).max(7).optional(), // 0..7 cuando enabled=true
  enabled: z.boolean().optional(), // true = asignar a slot, false = quitar de destacados
  reason: z.string().optional(),
}).refine(
  (data) => {
    if (data.enabled === true) return typeof data.position === "number";
    return true;
  },
  { message: "Con enabled=true se requiere position (0-7)", path: ["position"] },
);

type FeaturedPostResponse =
  | {
      ok: true;
      action: "upserted" | "deleted";
      position?: number;
      previousSlug?: string | null;
      previousProductId?: string | null;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid_request"
        | "product_not_found"
        | "config_error"
        | "unknown_error";
      message: string;
      details?: string;
    };

/**
 * GET /api/admin/products/featured
 * Lista todos los slots 0..7 con producto asignado (position, product_id, title, sku, slug)
 */
export async function GET(): Promise<NextResponse<unknown>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        { ok: false, code: "unauthorized", message: "No autorizado" },
        { status: 403 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, code: "config_error", message: "Configuración incompleta" },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: rows, error } = await supabase
      .from("featured")
      .select("position, product_id")
      .order("position", { ascending: true });

    if (error) {
      console.error("[featured GET] Error listando featured:", error);
      return NextResponse.json(
        { ok: false, code: "unknown_error", message: "Error al listar destacados", details: error.message },
        { status: 500 },
      );
    }

    const byPosition = new Map<number, string>();
    (rows ?? []).forEach((r: { position: number; product_id: string }) => {
      byPosition.set(r.position, r.product_id);
    });

    const productIds = [...new Set(byPosition.values())];
    let products: { id: string; title: string | null; sku: string | null; slug: string | null }[] = [];
    if (productIds.length > 0) {
      const { data: prods, error: prodsErr } = await supabase
        .from("products")
        .select("id, title, sku, slug")
        .in("id", productIds);
      if (!prodsErr && prods) products = prods;
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    const list: { position: number; product_id: string | null; title: string | null; sku: string | null; slug: string | null }[] = [];
    for (let pos = 0; pos <= 7; pos++) {
      const productId = byPosition.get(pos) ?? null;
      const p = productId ? productMap.get(productId) : null;
      list.push({
        position: pos,
        product_id: productId ?? null,
        title: p?.title ?? null,
        sku: p?.sku ?? null,
        slug: p?.slug ?? null,
      });
    }

    return NextResponse.json({ ok: true, slots: list });
  } catch (err) {
    console.error("[featured GET] Error inesperado:", err);
    return NextResponse.json(
      { ok: false, code: "unknown_error", message: "Error inesperado" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/products/featured
 * enabled=true => asignar producto a position (0..7). Si el slot está ocupado, reemplaza.
 * enabled=false => quitar el producto de featured (cualquier slot).
 */
export async function POST(req: NextRequest): Promise<NextResponse<FeaturedPostResponse>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        { ok: false, code: "unauthorized", message: "No tienes permisos para realizar esta acción" } satisfies FeaturedPostResponse,
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, code: "invalid_request", message: "Se espera un objeto JSON" } satisfies FeaturedPostResponse,
        { status: 400 },
      );
    }

    const validationResult = FeaturedPostSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json(
        { ok: false, code: "invalid_request", message: `Datos inválidos: ${errors}` } satisfies FeaturedPostResponse,
        { status: 400 },
      );
    }

    const { productSlug, position, enabled, reason } = validationResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { ok: false, code: "config_error", message: "Configuración de Supabase incompleta" } satisfies FeaturedPostResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, slug, title")
      .eq("slug", productSlug)
      .maybeSingle();

    if (productError) {
      console.error("[featured] Error al buscar producto:", { productSlug, error: productError });
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "Error al verificar el producto",
          details: productError.message,
        } satisfies FeaturedPostResponse,
        { status: 500 },
      );
    }
    if (!product) {
      return NextResponse.json(
        { ok: false, code: "product_not_found", message: "El producto no existe" } satisfies FeaturedPostResponse,
        { status: 404 },
      );
    }

    const removeFromFeatured = enabled === false;

    if (removeFromFeatured) {
      const { error: deleteError } = await supabase.from("featured").delete().eq("product_id", product.id);
      if (deleteError) {
        console.error("[featured] Error al eliminar de featured:", { productSlug, error: deleteError });
        return NextResponse.json(
          {
            ok: false,
            code: "unknown_error",
            message: "Error al eliminar el producto de destacados",
            details: deleteError.message,
          } satisfies FeaturedPostResponse,
          { status: 500 },
        );
      }
      console.log("[featured] Producto eliminado de destacados", {
        productSlug: sanitizeForLog(productSlug),
        adminEmail: sanitizeForLog(access.userEmail),
        reason: reason ? sanitizeForLog(reason) : undefined,
      });
      return NextResponse.json({
        ok: true,
        action: "deleted",
      } satisfies FeaturedPostResponse);
    }

    const pos = typeof position === "number" ? position : 0;

    // Verificar si la posición está ocupada (0 rows NO es error)
    const { data: existingRow, error: existingError } = await supabase
      .from("featured")
      .select("product_id")
      .eq("position", pos)
      .maybeSingle();

    if (existingError) {
      console.error("[featured] Error al verificar posición:", { position: pos, error: existingError });
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "Error al verificar la posición",
          details: existingError.message,
        } satisfies FeaturedPostResponse,
        { status: 500 },
      );
    }

    let previousSlug: string | null = null;
    let previousProductId: string | null = null;

    if (existingRow && existingRow.product_id && existingRow.product_id !== product.id) {
      previousProductId = existingRow.product_id;
      const { data: prevProduct } = await supabase
        .from("products")
        .select("slug")
        .eq("id", existingRow.product_id)
        .maybeSingle();
      previousSlug = prevProduct?.slug ?? null;

      const { error: deleteError } = await supabase.from("featured").delete().eq("position", pos);
      if (deleteError) {
        console.error("[featured] Error al liberar posición:", { position: pos, error: deleteError });
        return NextResponse.json(
          {
            ok: false,
            code: "unknown_error",
            message: "Error al reemplazar el producto destacado",
            details: deleteError.message,
          } satisfies FeaturedPostResponse,
          { status: 500 },
        );
      }
      console.log("[featured] Posición liberada (swap)", {
        position: pos,
        previousSlug: sanitizeForLog(previousSlug),
        newSlug: sanitizeForLog(productSlug),
      });
    }

    await supabase.from("featured").delete().eq("product_id", product.id);

    const { error: insertError } = await supabase.from("featured").insert({
      product_id: product.id,
      position: pos,
    });

    if (insertError) {
      console.error("[featured] Error al insertar featured:", { productSlug, position: pos, error: insertError });
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "Error al marcar el producto como destacado",
          details: insertError.message,
        } satisfies FeaturedPostResponse,
        { status: 500 },
      );
    }

    console.log("[featured] Producto marcado como destacado", {
      productSlug: sanitizeForLog(productSlug),
      position: pos,
      previousSlug: previousSlug ? sanitizeForLog(previousSlug) : null,
      adminEmail: sanitizeForLog(access.userEmail),
      reason: reason ? sanitizeForLog(reason) : undefined,
    });

    return NextResponse.json({
      ok: true,
      action: "upserted",
      position: pos,
      previousSlug,
      previousProductId,
    } satisfies FeaturedPostResponse);
  } catch (err) {
    console.error("[featured] Error inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: "Error inesperado al actualizar destacados",
        details: err instanceof Error ? err.message : String(err),
      } satisfies FeaturedPostResponse,
      { status: 500 },
    );
  }
}
