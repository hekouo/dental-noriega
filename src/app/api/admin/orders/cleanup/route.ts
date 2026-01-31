/**
 * Endpoint admin para limpieza de órdenes "basura":
 * - Canceladas (status=cancelled, no pagadas)
 * - Abandonadas (no pagadas, creadas hace más de N días)
 * Nunca borra órdenes con payment_status='paid'.
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";
import { sanitizeForLog } from "@/lib/utils/sanitizeForLog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CleanupRequestSchema = z.object({
  mode: z.enum(["cancelled", "abandoned", "both", "unpaid_any_age"]),
  olderThanDays: z.number().int().min(1).max(365).default(14),
  dryRun: z.boolean().default(true),
  excludeWithShipmentId: z.boolean().default(true),
});

type CleanupDryRunResponse = {
  ok: true;
  dryRun: true;
  ordersToDelete: number;
  orderItemsToDelete: number;
  sampleOrderIds: string[];
};

type CleanupExecuteResponse = {
  ok: true;
  dryRun: false;
  ordersDeleted: number;
  orderItemsDeleted: number;
};

type CleanupErrorResponse = {
  ok: false;
  code: "unauthorized" | "invalid_params" | "config_error" | "db_error" | "unknown_error";
  message: string;
};

export type CleanupResponse =
  | CleanupDryRunResponse
  | CleanupExecuteResponse
  | CleanupErrorResponse;

export async function POST(req: NextRequest): Promise<NextResponse<CleanupResponse>> {
  try {
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "Acceso denegado",
        } satisfies CleanupErrorResponse,
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = CleanupRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_params",
          message: parsed.error.errors[0]?.message ?? "Parámetros inválidos",
        } satisfies CleanupErrorResponse,
        { status: 400 },
      );
    }

    const { mode, olderThanDays, dryRun, excludeWithShipmentId } = parsed.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[orders/cleanup] Configuración de Supabase incompleta");
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración incompleta",
        } satisfies CleanupErrorResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    const cutoffIso = cutoff.toISOString();

    let orderIds: string[] = [];

    if (mode === "both") {
      let cancelledQuery = supabase
        .from("orders")
        .select("id")
        .neq("payment_status", "paid")
        .in("status", ["cancelled", "canceled"]);
      if (excludeWithShipmentId) {
        cancelledQuery = cancelledQuery.is("shipping_shipment_id", null);
      }
      let abandonedQuery = supabase
        .from("orders")
        .select("id")
        .neq("payment_status", "paid")
        .lt("created_at", cutoffIso);
      if (excludeWithShipmentId) {
        abandonedQuery = abandonedQuery.is("shipping_shipment_id", null);
      }
      const [cancelledRes, abandonedRes] = await Promise.all([
        cancelledQuery,
        abandonedQuery,
      ]);
      if (cancelledRes.error) {
        console.error(
          "[orders/cleanup] Error al listar canceladas:",
          sanitizeForLog(cancelledRes.error.message),
        );
        return NextResponse.json(
          {
            ok: false,
            code: "db_error",
            message: "Error al consultar órdenes",
          } satisfies CleanupErrorResponse,
          { status: 500 },
        );
      }
      if (abandonedRes.error) {
        console.error(
          "[orders/cleanup] Error al listar abandonadas:",
          sanitizeForLog(abandonedRes.error.message),
        );
        return NextResponse.json(
          {
            ok: false,
            code: "db_error",
            message: "Error al consultar órdenes",
          } satisfies CleanupErrorResponse,
          { status: 500 },
        );
      }
      const cancelledIds = (cancelledRes.data ?? []).map((r: { id: string }) => r.id);
      const abandonedIds = (abandonedRes.data ?? []).map((r: { id: string }) => r.id);
      orderIds = [...new Set([...cancelledIds, ...abandonedIds])];
    } else {
      let query = supabase
        .from("orders")
        .select("id")
        .neq("payment_status", "paid");
      if (excludeWithShipmentId) {
        query = query.is("shipping_shipment_id", null);
      }
      if (mode === "cancelled") {
        query = query.in("status", ["cancelled", "canceled"]);
      } else {
        query = query.lt("created_at", cutoffIso);
      }
      const { data: orderRows, error: listError } = await query;
      if (listError) {
        console.error(
          "[orders/cleanup] Error al listar órdenes:",
          sanitizeForLog(listError.message),
        );
        return NextResponse.json(
          {
            ok: false,
            code: "db_error",
            message: "Error al consultar órdenes",
          } satisfies CleanupErrorResponse,
          { status: 500 },
        );
      }
      orderIds = (orderRows ?? []).map((r: { id: string }) => r.id);
    }

    const ordersToDelete = orderIds.length;

    if (ordersToDelete === 0) {
      const dryPayload: CleanupDryRunResponse = {
        ok: true,
        dryRun: true,
        ordersToDelete: 0,
        orderItemsToDelete: 0,
        sampleOrderIds: [],
      };
      if (dryRun) {
        console.log("[orders/cleanup] Resumen", {
          mode: sanitizeForLog(mode),
          olderThanDays,
          dryRun: true,
          admin: sanitizeForLog(access.userEmail),
          ordersToDelete: 0,
          orderItemsToDelete: 0,
        });
        return NextResponse.json(dryPayload);
      }
      return NextResponse.json({
        ok: true,
        dryRun: false,
        ordersDeleted: 0,
        orderItemsDeleted: 0,
      } satisfies CleanupExecuteResponse);
    }

    // Contar order_items para estos order_ids
    const { count: itemsCount, error: countError } = await supabase
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .in("order_id", orderIds);

    const orderItemsToDelete = countError ? 0 : (itemsCount ?? 0);
    const sampleOrderIds = orderIds.slice(0, 10);

    if (dryRun) {
      console.log("[orders/cleanup] Resumen (dry run)", {
        mode: sanitizeForLog(mode),
        olderThanDays,
        dryRun: true,
        admin: sanitizeForLog(access.userEmail),
        ordersToDelete,
        orderItemsToDelete,
        sampleOrderIds: sampleOrderIds.map(sanitizeForLog),
      });
      return NextResponse.json({
        ok: true,
        dryRun: true,
        ordersToDelete,
        orderItemsToDelete,
        sampleOrderIds,
      } satisfies CleanupDryRunResponse);
    }

    // Ejecutar: borrar primero order_items, luego orders
    const { error: deleteItemsError } = await supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds);

    if (deleteItemsError) {
      console.error(
        "[orders/cleanup] Error al borrar order_items:",
        sanitizeForLog(deleteItemsError.message),
      );
      return NextResponse.json(
        {
          ok: false,
          code: "db_error",
          message: "Error al borrar items de órdenes",
        } satisfies CleanupErrorResponse,
        { status: 500 },
      );
    }

    const { error: deleteOrdersError } = await supabase.from("orders").delete().in("id", orderIds);

    if (deleteOrdersError) {
      console.error(
        "[orders/cleanup] Error al borrar órdenes:",
        sanitizeForLog(deleteOrdersError.message),
      );
      return NextResponse.json(
        {
          ok: false,
          code: "db_error",
          message: "Error al borrar órdenes",
        } satisfies CleanupErrorResponse,
        { status: 500 },
      );
    }

    console.log("[orders/cleanup] Resumen (ejecutado)", {
      mode: sanitizeForLog(mode),
      olderThanDays,
      dryRun: false,
      admin: sanitizeForLog(access.userEmail),
      ordersDeleted: orderIds.length,
      orderItemsDeleted: orderItemsToDelete,
    });

    return NextResponse.json({
      ok: true,
      dryRun: false,
      ordersDeleted: orderIds.length,
      orderItemsDeleted: orderItemsToDelete,
    } satisfies CleanupExecuteResponse);
  } catch (err) {
    console.error("[orders/cleanup] Error inesperado:", err);
    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: "Error inesperado",
      } satisfies CleanupErrorResponse,
      { status: 500 },
    );
  }
}
