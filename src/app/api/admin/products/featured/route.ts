import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FeaturedRequestSchema = z.object({
  productSlug: z.string().min(1, "El slug del producto es requerido"),
  position: z.number().int().min(0).max(7).nullable(), // null = delete
  reason: z.string().optional(), // Opcional: razón para auditar
});

type FeaturedResponse =
  | {
      ok: true;
      action: "upserted" | "deleted";
      position?: number;
      previousSlug?: string | null; // Si se reemplazó otro producto
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid_request"
        | "product_not_found"
        | "position_occupied"
        | "config_error"
        | "unknown_error";
      message: string;
      occupiedBy?: string; // Slug del producto que ocupa la posición
    };

/**
 * POST /api/admin/products/featured
 * Upsert o delete de productos destacados
 * Body: { productSlug: string, position: number | null, reason?: string }
 * Si position es null, se elimina de featured
 * Si position está ocupada, se reemplaza (política simple: swap)
 */
export async function POST(req: NextRequest): Promise<NextResponse<FeaturedResponse>> {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "No tienes permisos para realizar esta acción",
        } satisfies FeaturedResponse,
        { status: 403 },
      );
    }

    // Validar body
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "Datos inválidos: se espera un objeto JSON",
        } satisfies FeaturedResponse,
        { status: 400 },
      );
    }

    const validationResult = FeaturedRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: `Datos inválidos: ${errors}`,
        } satisfies FeaturedResponse,
        { status: 400 },
      );
    }

    const { productSlug, position, reason } = validationResult.data;

    // Crear cliente Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Supabase incompleta",
        } satisfies FeaturedResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar que el producto existe
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, slug, title")
      .eq("slug", productSlug)
      .maybeSingle();

    if (productError || !product) {
      console.error("[featured] Producto no encontrado:", { productSlug, error: productError });
      return NextResponse.json(
        {
          ok: false,
          code: "product_not_found",
          message: "El producto no existe",
        } satisfies FeaturedResponse,
        { status: 404 },
      );
    }

    // Si position es null, eliminar de featured
    if (position === null) {
      const { error: deleteError } = await supabase
        .from("featured")
        .delete()
        .eq("catalog_id", productSlug);

      if (deleteError) {
        console.error("[featured] Error al eliminar de featured:", {
          productSlug,
          error: deleteError,
        });
        return NextResponse.json(
          {
            ok: false,
            code: "unknown_error",
            message: "Error al eliminar el producto de destacados",
          } satisfies FeaturedResponse,
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
      } satisfies FeaturedResponse);
    }

    // Si position está definida, verificar si está ocupada
    const { data: existingFeatured, error: existingError } = await supabase
      .from("featured")
      .select("catalog_id")
      .eq("position", position)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      // PGRST116 = no rows
      console.error("[featured] Error al verificar posición:", {
        position,
        error: existingError,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "Error al verificar la posición",
        } satisfies FeaturedResponse,
        { status: 500 },
      );
    }

    let previousSlug: string | null = null;

    // Si la posición está ocupada, eliminar el registro anterior (swap)
    if (existingFeatured && existingFeatured.catalog_id !== productSlug) {
      previousSlug = existingFeatured.catalog_id;
      const { error: deleteError } = await supabase
        .from("featured")
        .delete()
        .eq("position", position);

      if (deleteError) {
        console.error("[featured] Error al eliminar featured anterior:", {
          position,
          previousSlug,
          error: deleteError,
        });
        return NextResponse.json(
          {
            ok: false,
            code: "unknown_error",
            message: "Error al reemplazar el producto destacado",
          } satisfies FeaturedResponse,
          { status: 500 },
        );
      }

      console.log("[featured] Posición liberada (swap)", {
        position,
        previousSlug: sanitizeForLog(previousSlug),
        newSlug: sanitizeForLog(productSlug),
      });
    }

    // Eliminar cualquier featured anterior de este producto (para evitar duplicados)
    await supabase.from("featured").delete().eq("catalog_id", productSlug);

    // Insertar nuevo featured
    const { error: insertError } = await supabase
      .from("featured")
      .insert({
        catalog_id: productSlug,
        position,
      });

    if (insertError) {
      console.error("[featured] Error al insertar featured:", {
        productSlug,
        position,
        error: insertError,
      });
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: "Error al marcar el producto como destacado",
        } satisfies FeaturedResponse,
        { status: 500 },
      );
    }

    console.log("[featured] Producto marcado como destacado", {
      productSlug: sanitizeForLog(productSlug),
      position,
      previousSlug: previousSlug ? sanitizeForLog(previousSlug) : null,
      adminEmail: sanitizeForLog(access.userEmail),
      reason: reason ? sanitizeForLog(reason) : undefined,
    });

    return NextResponse.json({
      ok: true,
      action: "upserted",
      position,
      previousSlug,
    } satisfies FeaturedResponse);
  } catch (err) {
    console.error("[featured] Error inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: "Error inesperado al actualizar destacados",
      } satisfies FeaturedResponse,
      { status: 500 },
    );
  }
}
