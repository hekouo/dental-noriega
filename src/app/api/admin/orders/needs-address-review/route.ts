/**
 * Endpoint admin para marcar orden como "necesita revisión de dirección"
 * Dispara email al cliente con idempotencia
 */

import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { checkAdminAccess } from "@/lib/admin/access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NeedsAddressReviewRequestSchema = z.object({
  orderId: z.string().uuid("orderId debe ser un UUID válido"),
});

type NeedsAddressReviewResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code:
        | "unauthorized"
        | "invalid_order_id"
        | "order_not_found"
        | "update_error"
        | "config_error"
        | "unknown_error";
      message: string;
    };

export async function POST(req: NextRequest) {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "Acceso denegado",
        } satisfies NeedsAddressReviewResponse,
        { status: 403 },
      );
    }

    // Parsear y validar body
    const body = await req.json();
    const validationResult = NeedsAddressReviewRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_order_id",
          message: validationResult.error.errors[0]?.message || "orderId inválido",
        } satisfies NeedsAddressReviewResponse,
        { status: 400 },
      );
    }

    const { orderId } = validationResult.data;

    // Configurar Supabase con service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[needs-address-review] Configuración de Supabase incompleta");
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración incompleta",
        } satisfies NeedsAddressReviewResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Obtener orden actual
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, metadata, shipping_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[needs-address-review] Error al obtener orden:", orderError);
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "Orden no encontrada",
        } satisfies NeedsAddressReviewResponse,
        { status: 404 },
      );
    }

    // Merge seguro de metadata
    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      needs_address_review: true,
    };
    
    // CRÍTICO: Releer metadata justo antes del update para evitar race conditions
    const { data: freshOrderData } = await supabase
      .from("orders")
      .select("metadata, updated_at")
      .eq("id", orderId)
      .single();
    
    const freshMetadata = (freshOrderData?.metadata as Record<string, unknown>) || {};
    const freshUpdatedAt = freshOrderData?.updated_at as string | null | undefined;
    
    // Aplicar preserveRateUsed para garantizar que rate_used nunca quede null
    const { preserveRateUsed } = await import("@/lib/shipping/normalizeShippingMetadata");
    const { logPreWrite, logPostWrite } = await import("@/lib/shipping/metadataWriterLogger");
    
    const finalMetadata = preserveRateUsed(freshMetadata, updatedMetadata);
    
    // INSTRUMENTACIÓN PRE-WRITE
    logPreWrite("needs-address-review", orderId, freshMetadata, freshUpdatedAt, finalMetadata);

    // Actualizar orden: metadata y opcionalmente shipping_status
    const updateData: Record<string, unknown> = {
      metadata: finalMetadata,
      updated_at: new Date().toISOString(),
    };

    // Opcionalmente actualizar shipping_status si no está en un estado final
    if (
      !order.shipping_status ||
      (order.shipping_status !== "delivered" &&
        order.shipping_status !== "cancelled")
    ) {
      updateData.shipping_status = "needs_address_review";
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId)
      .select("id, metadata, updated_at")
      .single();
    
    // INSTRUMENTACIÓN POST-WRITE
    if (updatedOrder) {
      const postWriteMetadata = (updatedOrder.metadata as Record<string, unknown>) || {};
      const postWriteUpdatedAt = updatedOrder.updated_at as string | null | undefined;
      logPostWrite("needs-address-review", orderId, postWriteMetadata, postWriteUpdatedAt);
    }

    if (updateError) {
      console.error("[needs-address-review] Error al actualizar orden:", updateError);
      return NextResponse.json(
        {
          ok: false,
          code: "update_error",
          message: "Error al actualizar orden",
        } satisfies NeedsAddressReviewResponse,
        { status: 500 },
      );
    }

    // Enviar email de solicitud de revisión (idempotente)
    try {
      const { sendNeedsAddressReviewEmail } = await import("@/lib/email/orderEmails");
      const emailResult = await sendNeedsAddressReviewEmail(orderId);
      if (!emailResult.ok) {
        console.warn("[needs-address-review] Error al enviar email:", emailResult.error);
        // No fallar el endpoint si falla el email, pero loguear
      } else if (emailResult.sent) {
        console.log("[needs-address-review] Email de revisión de dirección enviado:", orderId);
      }
    } catch (emailError) {
      console.error("[needs-address-review] Error inesperado al enviar email:", emailError);
      // No fallar el endpoint si falla el email
    }

    return NextResponse.json({
      ok: true,
      message: "Orden marcada como necesita revisión de dirección",
    } satisfies NeedsAddressReviewResponse);
  } catch (error) {
    console.error("[needs-address-review] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "unknown_error",
        message: "Error inesperado",
      } satisfies NeedsAddressReviewResponse,
      { status: 500 },
    );
  }
}
