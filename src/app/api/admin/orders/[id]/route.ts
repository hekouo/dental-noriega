/**
 * DELETE /api/admin/orders/[id]
 * Borrado de una orden específica (solo admin).
 * Por defecto no borra si payment_status='paid' o si tiene shipping_shipment_id.
 * Con force=true exige reason (min 5 chars) y permite borrar igual.
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DeleteBodySchema = z.object({
  force: z.boolean().optional().default(false),
  reason: z.string().optional(),
});

type DeleteSuccessResponse = {
  ok: true;
  deletedOrder: true;
  deletedItems: number;
};

type DeleteErrorResponse = {
  ok: false;
  code: "unauthorized" | "invalid_id" | "order_not_found" | "protected-order" | "config_error" | "db_error" | "force_requires_reason" | "unknown_error";
  reason?: "paid" | "has_shipment";
  message?: string;
};

export type DeleteOrderResponse = DeleteSuccessResponse | DeleteErrorResponse;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<DeleteOrderResponse>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "Acceso denegado",
        } satisfies DeleteErrorResponse,
        { status: 403 },
      );
    }

    const { id } = await context.params;
    if (!id || !isValidUUID(id)) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_id",
          message: "ID de orden inválido (debe ser UUID)",
        } satisfies DeleteErrorResponse,
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = DeleteBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "unknown_error",
          message: parsed.error.errors[0]?.message ?? "Parámetros inválidos",
        } satisfies DeleteErrorResponse,
        { status: 400 },
      );
    }

    const { force, reason } = parsed.data;

    if (force) {
      const trimmedReason = (reason ?? "").trim();
      if (trimmedReason.length < 5) {
        return NextResponse.json(
          {
            ok: false,
            code: "force_requires_reason",
            message: "Con force=true se requiere reason de al menos 5 caracteres",
          } satisfies DeleteErrorResponse,
          { status: 400 },
        );
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[orders/delete] Configuración de Supabase incompleta");
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración incompleta",
        } satisfies DeleteErrorResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, payment_status, shipping_shipment_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[orders/delete] Error al obtener orden:", sanitizeForLog(fetchError.message));
      return NextResponse.json(
        {
          ok: false,
          code: "db_error",
          message: "Error al consultar orden",
        } satisfies DeleteErrorResponse,
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "Orden no encontrada",
        } satisfies DeleteErrorResponse,
        { status: 404 },
      );
    }

    if (!force) {
      if (order.payment_status === "paid") {
        return NextResponse.json(
          {
            ok: false,
            code: "protected-order",
            reason: "paid",
            message: "No se puede borrar una orden pagada sin forzar",
          } satisfies DeleteErrorResponse,
          { status: 409 },
        );
      }
      if (order.shipping_shipment_id != null && String(order.shipping_shipment_id).trim() !== "") {
        return NextResponse.json(
          {
            ok: false,
            code: "protected-order",
            reason: "has_shipment",
            message: "No se puede borrar una orden con guía creada sin forzar",
          } satisfies DeleteErrorResponse,
          { status: 409 },
        );
      }
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", id);

    if (itemsError) {
      console.error("[orders/delete] Error al listar items:", sanitizeForLog(itemsError.message));
      return NextResponse.json(
        {
          ok: false,
          code: "db_error",
          message: "Error al consultar items",
        } satisfies DeleteErrorResponse,
        { status: 500 },
      );
    }

    const deletedItemsCount = (itemsData ?? []).length;

    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);

    if (deleteItemsError) {
      console.error("[orders/delete] Error al borrar order_items:", sanitizeForLog(deleteItemsError.message));
      return NextResponse.json(
        {
          ok: false,
          code: "db_error",
          message: "Error al borrar items de la orden",
        } satisfies DeleteErrorResponse,
        { status: 500 },
      );
    }

    const { error: deleteOrderError } = await supabase.from("orders").delete().eq("id", id);

    if (deleteOrderError) {
      console.error("[orders/delete] Error al borrar orden:", sanitizeForLog(deleteOrderError.message));
      return NextResponse.json(
        {
          ok: false,
          code: "db_error",
          message: "Error al borrar orden",
        } satisfies DeleteErrorResponse,
        { status: 500 },
      );
    }

    console.log("[orders/delete] Resumen", {
      orderId: sanitizeForLog(id),
      force,
      reason: force ? sanitizeForLog(reason) : undefined,
      adminEmail: sanitizeForLog(access.userEmail),
      deletedItemsCount,
      deletedOrderCount: 1,
    });

    return NextResponse.json({
      ok: true,
      deletedOrder: true,
      deletedItems: deletedItemsCount,
    } satisfies DeleteSuccessResponse);
  } catch (err) {
    console.error("[orders/delete] Error inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: "Error inesperado",
      } satisfies DeleteErrorResponse,
      { status: 500 },
    );
  }
}
