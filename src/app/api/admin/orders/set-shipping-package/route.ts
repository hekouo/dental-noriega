import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { createClient } from "@supabase/supabase-js";
import { getPackageProfile, type PackageProfileKey, validatePackageDimensions } from "@/lib/shipping/packageProfiles";

export const dynamic = "force-dynamic";

type SetShippingPackageResponse =
  | {
      ok: true;
      shippingPackage: {
        mode: "profile" | "custom";
        profile: PackageProfileKey | null;
        length_cm: number;
        width_cm: number;
        height_cm: number;
        weight_g: number;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

/**
 * POST /api/admin/orders/set-shipping-package
 * 
 * Establece el perfil o dimensiones personalizadas de empaque para una orden
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar acceso admin
    const access = await checkAdminAccess();
    if (access.status !== "allowed") {
      return NextResponse.json(
        {
          ok: false,
          code: "unauthorized",
          message: "No tienes permisos para realizar esta acción.",
        } satisfies SetShippingPackageResponse,
        { status: 401 },
      );
    }

    const body = await req.json();
    const { orderId, profile, custom } = body;

    // Validaciones básicas
    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "orderId es requerido.",
        } satisfies SetShippingPackageResponse,
        { status: 400 },
      );
    }

    // Validar que se proporcione profile o custom, pero no ambos
    if (!profile && !custom) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "Se debe proporcionar 'profile' o 'custom'.",
        } satisfies SetShippingPackageResponse,
        { status: 400 },
      );
    }

    if (profile && custom) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "No se pueden proporcionar 'profile' y 'custom' al mismo tiempo.",
        } satisfies SetShippingPackageResponse,
        { status: 400 },
      );
    }

    // Obtener orden
    const order = await getOrderWithItemsAdmin(orderId);
    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          code: "order_not_found",
          message: "La orden no existe.",
        } satisfies SetShippingPackageResponse,
        { status: 404 },
      );
    }

    // Validar que la orden no tenga label ya creada (no permitir cambios después de label)
    if (order.shipping_tracking_number || order.shipping_label_url) {
      return NextResponse.json(
        {
          ok: false,
          code: "label_already_created",
          message:
            "No se puede cambiar el empaque porque ya se creó la guía. Primero cancela la guía existente.",
        } satisfies SetShippingPackageResponse,
        { status: 409 },
      );
    }

    // Determinar modo y valores
    let shippingPackage: {
      mode: "profile" | "custom";
      profile: PackageProfileKey | null;
      length_cm: number;
      width_cm: number;
      height_cm: number;
      weight_g: number;
    };

    if (profile) {
      // Modo profile
      if (!["ENVELOPE", "BOX_S", "BOX_M"].includes(profile)) {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_profile",
            message: "Perfil inválido. Debe ser ENVELOPE, BOX_S o BOX_M.",
          } satisfies SetShippingPackageResponse,
          { status: 400 },
        );
      }

      const profileData = getPackageProfile(profile as PackageProfileKey);
      shippingPackage = {
        mode: "profile",
        profile: profile as PackageProfileKey,
        length_cm: profileData.length_cm,
        width_cm: profileData.width_cm,
        height_cm: profileData.height_cm,
        weight_g: profileData.weight_g,
      };
    } else {
      // Modo custom
      if (
        typeof custom.length_cm !== "number" ||
        typeof custom.width_cm !== "number" ||
        typeof custom.height_cm !== "number" ||
        typeof custom.weight_g !== "number"
      ) {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_custom",
            message: "custom debe incluir length_cm, width_cm, height_cm y weight_g numéricos.",
          } satisfies SetShippingPackageResponse,
          { status: 400 },
        );
      }

      // Validar dimensiones
      const validation = validatePackageDimensions(
        custom.length_cm,
        custom.width_cm,
        custom.height_cm,
        custom.weight_g,
      );
      if (!validation.valid) {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_dimensions",
            message: validation.error || "Dimensiones inválidas.",
          } satisfies SetShippingPackageResponse,
          { status: 400 },
        );
      }

      shippingPackage = {
        mode: "custom",
        profile: null,
        length_cm: custom.length_cm,
        width_cm: custom.width_cm,
        height_cm: custom.height_cm,
        weight_g: custom.weight_g,
      };
    }

    // Actualizar metadata
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Supabase incompleta.",
        } satisfies SetShippingPackageResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const currentMetadata = (order.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      shipping_package: shippingPackage,
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
    logPreWrite("set-shipping-package", orderId, freshMetadata, freshUpdatedAt, finalMetadata);

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
      logPostWrite("set-shipping-package", orderId, postWriteMetadata, postWriteUpdatedAt);
    }

    if (updateError) {
      console.error("[set-shipping-package] Error al actualizar orden:", updateError);
      return NextResponse.json(
        {
          ok: false,
          code: "update_failed",
          message: "Error al actualizar la orden. Revisa los logs.",
        } satisfies SetShippingPackageResponse,
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      shippingPackage,
    } satisfies SetShippingPackageResponse);
  } catch (error) {
    console.error("[set-shipping-package] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Error al establecer el empaque. Revisa los logs.",
      } satisfies SetShippingPackageResponse,
      { status: 500 },
    );
  }
}
