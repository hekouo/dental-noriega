import { NextRequest, NextResponse } from "next/server";
import "server-only";
import { checkAdminAccess } from "@/lib/admin/access";
import { createClient } from "@supabase/supabase-js";
import { validatePackageDimensions } from "@/lib/shipping/packageProfiles";
import type { PackageProfileKey } from "@/lib/shipping/packageProfiles";

export const dynamic = "force-dynamic";

type UpdateProductShippingResponse =
  | {
      ok: true;
      message: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

/**
 * POST /api/admin/products/update-shipping
 * 
 * Actualiza peso y dimensiones de envío de un producto
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
        } satisfies UpdateProductShippingResponse,
        { status: 401 },
      );
    }

    const body = await req.json();
    const {
      productId,
      weight_g,
      length_cm,
      width_cm,
      height_cm,
      shipping_profile,
    } = body;

    // Validaciones básicas
    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_request",
          message: "productId es requerido.",
        } satisfies UpdateProductShippingResponse,
        { status: 400 },
      );
    }

    // Validar valores numéricos si se proporcionan
    if (weight_g !== null && weight_g !== undefined) {
      if (typeof weight_g !== "number" && typeof weight_g !== "string") {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_request",
            message: "weight_g debe ser un número o null.",
          } satisfies UpdateProductShippingResponse,
          { status: 400 },
        );
      }
    }

    if (length_cm !== null && length_cm !== undefined) {
      if (typeof length_cm !== "number" && typeof length_cm !== "string") {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_request",
            message: "length_cm debe ser un número o null.",
          } satisfies UpdateProductShippingResponse,
          { status: 400 },
        );
      }
    }

    if (width_cm !== null && width_cm !== undefined) {
      if (typeof width_cm !== "number" && typeof width_cm !== "string") {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_request",
            message: "width_cm debe ser un número o null.",
          } satisfies UpdateProductShippingResponse,
          { status: 400 },
        );
      }
    }

    if (height_cm !== null && height_cm !== undefined) {
      if (typeof height_cm !== "number" && typeof height_cm !== "string") {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_request",
            message: "height_cm debe ser un número o null.",
          } satisfies UpdateProductShippingResponse,
          { status: 400 },
        );
      }
    }

    // Validar shipping_profile si se proporciona
    if (
      shipping_profile !== null &&
      shipping_profile !== undefined &&
      !["ENVELOPE", "BOX_S", "BOX_M", "CUSTOM"].includes(shipping_profile)
    ) {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_profile",
          message: "shipping_profile debe ser ENVELOPE, BOX_S, BOX_M, CUSTOM o null.",
        } satisfies UpdateProductShippingResponse,
        { status: 400 },
        );
    }

    // Convertir valores a números si son strings
    const weightGrams =
      weight_g === null || weight_g === undefined
        ? null
        : typeof weight_g === "string"
          ? parseFloat(weight_g)
          : weight_g;
    const lengthCm =
      length_cm === null || length_cm === undefined
        ? null
        : typeof length_cm === "string"
          ? parseFloat(length_cm)
          : length_cm;
    const widthCm =
      width_cm === null || width_cm === undefined
        ? null
        : typeof width_cm === "string"
          ? parseFloat(width_cm)
          : width_cm;
    const heightCm =
      height_cm === null || height_cm === undefined
        ? null
        : typeof height_cm === "string"
          ? parseFloat(height_cm)
          : height_cm;

    // Validar dimensiones si todas están presentes
    if (
      weightGrams !== null &&
      lengthCm !== null &&
      widthCm !== null &&
      heightCm !== null
    ) {
      const validation = validatePackageDimensions(
        lengthCm,
        widthCm,
        heightCm,
        weightGrams,
      );
      if (!validation.valid) {
        return NextResponse.json(
          {
            ok: false,
            code: "invalid_dimensions",
            message: validation.error || "Dimensiones inválidas.",
          } satisfies UpdateProductShippingResponse,
          { status: 400 },
        );
      }
    }

    // Actualizar producto
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          code: "config_error",
          message: "Configuración de Supabase incompleta.",
        } satisfies UpdateProductShippingResponse,
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Construir objeto de actualización
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (weightGrams !== null && weightGrams !== undefined) {
      updateData.shipping_weight_g = Math.round(weightGrams);
    }
    if (lengthCm !== null && lengthCm !== undefined) {
      updateData.shipping_length_cm = Math.round(lengthCm);
    }
    if (widthCm !== null && widthCm !== undefined) {
      updateData.shipping_width_cm = Math.round(widthCm);
    }
    if (heightCm !== null && heightCm !== undefined) {
      updateData.shipping_height_cm = Math.round(heightCm);
    }
    if (shipping_profile !== undefined) {
      updateData.shipping_profile = shipping_profile as PackageProfileKey | null;
    }

    const { error: updateError } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", productId);

    if (updateError) {
      console.error("[update-product-shipping] Error al actualizar producto:", updateError);
      return NextResponse.json(
        {
          ok: false,
          code: "update_failed",
          message: "Error al actualizar el producto. Revisa los logs.",
        } satisfies UpdateProductShippingResponse,
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Dimensiones de envío actualizadas correctamente.",
    } satisfies UpdateProductShippingResponse);
  } catch (error) {
    console.error("[update-product-shipping] Error inesperado:", error);
    return NextResponse.json(
      {
        ok: false,
        code: "internal_error",
        message: "Error al actualizar las dimensiones. Revisa los logs.",
      } satisfies UpdateProductShippingResponse,
      { status: 500 },
    );
  }
}
