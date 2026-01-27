import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SetShippingPackageFinalRequestSchema = z.object({
  orderId: z.string().uuid(),
  weight_g: z.number().int().positive(),
  length_cm: z.number().int().positive(),
  width_cm: z.number().int().positive(),
  height_cm: z.number().int().positive(),
});

type SetShippingPackageFinalResponse =
  | {
      ok: true;
      shippingPackageFinal: {
        weight_g: number;
        length_cm: number;
        width_cm: number;
        height_cm: number;
        mode: "custom";
        updated_at: string;
      };
    }
  | {
      ok: false;
      code: "invalid_request" | "order_not_found" | "update_failed" | "internal_error";
      message: string;
    };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "Request body debe ser un objeto JSON",
        } satisfies SetShippingPackageFinalResponse,
        { status: 400 },
      );
    }

    const validationResult = SetShippingPackageFinalRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: `Datos inválidos: ${errors}`,
        } satisfies SetShippingPackageFinalResponse,
        { status: 422 },
      );
    }

    const { orderId, weight_g, length_cm, width_cm, height_cm } = validationResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[set-shipping-package-final] Configuración de Supabase incompleta");
      return NextResponse.json(
        {
          ok: false,
          code: "internal_error",
          message: "Error de configuración del servidor",
        } satisfies SetShippingPackageFinalResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar que la orden existe
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, metadata")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchError) {
      console.error("[set-shipping-package-final] Error al obtener orden:", fetchError);
      return NextResponse.json(
        {
          ok: false,
          code: "internal_error",
          message: "Error al obtener la orden. Revisa los logs.",
        } satisfies SetShippingPackageFinalResponse,
        { status: 500 },
      );
    }

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "Orden no encontrada",
        } satisfies SetShippingPackageFinalResponse,
        { status: 404 },
      );
    }

    // Construir shipping_package_final
    const shippingPackageFinal = {
      weight_g,
      length_cm,
      width_cm,
      height_cm,
      mode: "custom" as const,
      updated_at: new Date().toISOString(),
    };

    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      shipping_package_final: shippingPackageFinal,
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
    logPreWrite("set-shipping-package-final", orderId, freshMetadata, freshUpdatedAt, finalMetadata);

    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({
        metadata: finalMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select("id, metadata, updated_at")
      .single();
    
    // INSTRUMENTACIÓN POST-WRITE
    if (updatedOrder) {
      const postWriteMetadata = (updatedOrder.metadata as Record<string, unknown>) || {};
      const postWriteUpdatedAt = updatedOrder.updated_at as string | null | undefined;
      logPostWrite("set-shipping-package-final", orderId, postWriteMetadata, postWriteUpdatedAt);
    }

    if (updateError) {
      console.error("[set-shipping-package-final] Error al actualizar orden:", updateError);
      return NextResponse.json(
        {
          ok: false,
          code: "update_failed",
          message: "Error al actualizar la orden. Revisa los logs.",
        } satisfies SetShippingPackageFinalResponse,
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      shippingPackageFinal,
    } satisfies SetShippingPackageFinalResponse);
  } catch (error) {
    console.error("[set-shipping-package-final] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Error al establecer el paquete final. Revisa los logs.",
      } satisfies SetShippingPackageFinalResponse,
      { status: 500 },
    );
  }
}
