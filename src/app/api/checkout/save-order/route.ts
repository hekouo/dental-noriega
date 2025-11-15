import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
const OrderItemSchema = z.object({
  productId: z.string().uuid().optional(),
  title: z.string().min(1),
  qty: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
  image_url: z.string().url().optional().nullable(),
});

const SaveOrderRequestSchema = z.object({
  order_id: z.string().uuid(),
  email: z.string().email(),
  items: z.array(OrderItemSchema).min(1),
  total_cents: z.number().int().positive(),
  status: z.enum(["pending", "paid", "failed", "canceled"]),
  payment_provider: z.string().default("stripe"),
  payment_id: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

type SaveOrderRequest = z.infer<typeof SaveOrderRequestSchema>;

export async function POST(req: NextRequest) {
  noStore();
  try {
    const body = await req.json().catch(() => null);
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Datos inválidos: se espera un objeto JSON" },
        { status: 422 },
      );
    }

    // Validar con Zod
    const validationResult = SaveOrderRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      console.warn("[save-order] Validación fallida:", errors);
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 422 },
      );
    }

    const orderData = validationResult.data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      console.error("[save-order] NEXT_PUBLIC_SUPABASE_URL no está configurado");
      return NextResponse.json(
        { error: "No se pudo guardar la orden: configuración de Supabase incompleta" },
        { status: 500 },
      );
    }

    if (!serviceRoleKey) {
      console.error("[save-order] SUPABASE_SERVICE_ROLE_KEY no está configurado");
      return NextResponse.json(
        { error: "No se pudo guardar la orden: falta clave de servicio de Supabase" },
        { status: 500 },
      );
    }

    // Intentar obtener user_id de la sesión
    let user_id: string | null = null;
    try {
      const authSupabase = createActionSupabase();
      const {
        data: { user },
      } = await authSupabase.auth.getUser();
      user_id = user?.id ?? null;
    } catch {
      // Si no hay sesión, continuar como guest (user_id = null)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar si la orden ya existe
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("id", orderData.order_id)
      .single();

    // Construir metadata con toda la información adicional
    const metadata: Record<string, unknown> = {
      ...orderData.metadata,
      items: orderData.items.map((item) => ({
        productId: item.productId,
        title: item.title,
        qty: item.qty,
        unitPriceCents: item.unitPriceCents,
        image_url: item.image_url,
      })),
    };

    if (existingOrder) {
      // Actualizar orden existente usando el schema real
      // IMPORTANTE: NO eliminamos ni recreamos order_items aquí
      // Los items ya fueron creados en create-order y solo se actualizan si es necesario
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          user_id: user_id,
          email: orderData.email,
          total_cents: orderData.total_cents,
          status: orderData.status,
          payment_provider: orderData.payment_provider || "stripe",
          payment_id: orderData.payment_id || null,
          metadata: metadata,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderData.order_id);

      if (updateError) {
        console.error("[save-order] Error al actualizar orden:", {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          order_id: orderData.order_id,
        });
        return NextResponse.json(
          { error: "No se pudo guardar la orden" },
          { status: 500 },
        );
      }

      // Verificar si ya existen items para esta orden
      const { data: existingItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", orderData.order_id)
        .limit(1);

      // Solo insertar items si NO existen (idempotencia)
      if (!existingItems || existingItems.length === 0) {
        const orderItems = orderData.items.map((item) => ({
          order_id: orderData.order_id,
          product_id: item.productId || null,
          title: item.title,
          unit_price_cents: item.unitPriceCents,
          qty: item.qty,
          image_url: item.image_url || null,
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          console.error("[save-order] Error al crear items:", {
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint,
            code: itemsError.code,
            order_id: orderData.order_id,
            items_count: orderItems.length,
          });
          // No fallar completamente si los items ya existen
          if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
            console.warn("[save-order] Items no insertados (puede que ya existan)");
          }
        }
      } else {
        if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
          console.info("[save-order] Items ya existen para esta orden, no se insertan duplicados");
        }
      }

      return NextResponse.json({
        success: true,
        order_id: orderData.order_id,
      });
    } else {
      // Crear nueva orden usando el schema real
      const { error: insertError } = await supabase
        .from("orders")
        .insert({
          id: orderData.order_id,
          user_id: user_id,
          email: orderData.email,
          total_cents: orderData.total_cents,
          status: orderData.status,
          payment_provider: orderData.payment_provider || "stripe",
          payment_id: orderData.payment_id || null,
          metadata: metadata,
        });

      if (insertError) {
        console.error("[save-order] Error al crear orden:", {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
          order_id: orderData.order_id,
          email: orderData.email,
        });
        return NextResponse.json(
          { error: "No se pudo guardar la orden" },
          { status: 500 },
        );
      }

      // Crear items de la orden solo si la orden es nueva
      // IMPORTANTE: unit_price_cents es el precio UNITARIO en centavos
      const orderItems = orderData.items.map((item) => ({
        order_id: orderData.order_id,
        product_id: item.productId || null,
        title: item.title,
        unit_price_cents: item.unitPriceCents, // INT en centavos - precio UNITARIO
        qty: item.qty,
        image_url: item.image_url || null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("[save-order] Error al crear items:", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
          order_id: orderData.order_id,
          items_count: orderItems.length,
        });
        return NextResponse.json(
          { error: "No se pudo guardar la orden" },
          { status: 500 },
        );
      }
    }

    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.info("[save-order] Orden guardada exitosamente:", {
        order_id: orderData.order_id,
        email: orderData.email,
        total_cents: orderData.total_cents,
        status: orderData.status,
        items_count: orderData.items.length,
      });
    }

    return NextResponse.json({
      success: true,
      order_id: orderData.order_id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    console.error("[save-order]", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}

