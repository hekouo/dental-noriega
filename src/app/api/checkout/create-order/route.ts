import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Schema Zod para validación
const OrderItemSchema = z.object({
  id: z.string().min(1),
  qty: z.number().int().positive(),
  price_cents: z.number().int().nonnegative(),
});

const CreateOrderRequestSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  shippingMethod: z.enum(["pickup", "delivery"]).optional(),
});

type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

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
    const validationResult = CreateOrderRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      console.warn("[create-order] Validación fallida:", errors);
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 422 },
      );
    }

    const orderData = validationResult.data;

    // Validar que items.length > 0 y todos los price_cents > 0 y qty > 0
    if (orderData.items.length === 0) {
      return NextResponse.json(
        { error: "El carrito está vacío" },
        { status: 422 },
      );
    }

    const hasInvalidItem = orderData.items.some(
      (item) => item.price_cents <= 0 || item.qty <= 0,
    );

    if (hasInvalidItem) {
      return NextResponse.json(
        { error: "Todos los items deben tener precio y cantidad mayor a 0" },
        { status: 422 },
      );
    }

    // Calcular total_cents
    const total_cents = orderData.items.reduce(
      (sum, item) => sum + item.qty * item.price_cents,
      0,
    );

    // Log controlado para debugging
    if (process.env.NEXT_PUBLIC_CHECKOUT_DEBUG === "1") {
      console.info("[create-order] payload recibido:", {
        items_count: orderData.items.length,
        items: orderData.items.map((i) => ({
          id: i.id,
          qty: i.qty,
          price_cents: i.price_cents,
        })),
        total_cents,
      });
    }

    if (!total_cents || total_cents <= 0) {
      console.warn("[create-order] Total inválido:", {
        total_cents,
        items: orderData.items.map((i) => ({
          id: i.id,
          qty: i.qty,
          price_cents: i.price_cents,
        })),
      });
      return NextResponse.json(
        { error: "Total de la orden inválido" },
        { status: 422 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Si Supabase no está configurado, generar un order_id temporal para que Stripe funcione
    if (!supabaseUrl || !serviceRoleKey) {
      const crypto = await import("crypto");
      const tempOrderId = crypto.randomUUID();
      
      console.info("[create-order] order", tempOrderId, total_cents);
      
      return NextResponse.json({
        order_id: tempOrderId,
        total_cents,
        currency: "mxn",
      });
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
      // Si no hay sesión, continuar como guest
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Construir metadata con información adicional
    const metadata: Record<string, unknown> = {
      subtotal_cents: total_cents, // Por ahora subtotal = total (sin envío ni descuento aún)
      shipping_cost_cents: 0,
      discount_cents: 0,
      shipping_method: orderData.shippingMethod || "pickup",
      contact_name: orderData.name || null,
      contact_email: orderData.email || null,
    };

    // Crear orden usando SOLO las columnas válidas del schema real
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user_id,
        email: orderData.email || null,
        total_cents: total_cents, // INT en centavos
        status: "pending",
        payment_provider: null, // Se actualizará cuando se cree el PaymentIntent
        payment_id: null,
        metadata: metadata,
      })
      .select("id, total_cents")
      .single();

    if (orderError || !order) {
      console.error("[create-order] Error al crear orden:", {
        message: orderError?.message,
        details: orderError?.details,
        hint: orderError?.hint,
        code: orderError?.code,
        total_cents,
        items_count: orderData.items.length,
      });
      return NextResponse.json(
        { error: `Error al crear orden: ${orderError?.message || "Error desconocido"}` },
        { status: 500 },
      );
    }

    // Crear items de la orden usando SOLO las columnas válidas del schema real
    const orderItems = orderData.items.map((item) => {
      if (item.price_cents <= 0) {
        console.warn("[create-order] Item con precio inválido:", {
          id: item.id,
          price_cents: item.price_cents,
        });
      }
      return {
        order_id: order.id,
        product_id: item.id || null, // UUID si es válido, sino null
        title: `Producto ${item.id}`, // Fallback, se actualizará en save-order con el título real
        unit_price_cents: item.price_cents, // INT en centavos
        qty: item.qty,
        image_url: null, // Se actualizará en save-order con la imagen real
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Limpiar orden si fallan los items
      await supabase.from("orders").delete().eq("id", order.id);
      console.error("[create-order] Error al crear items:", {
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        code: itemsError.code,
        order_id: order.id,
        items_count: orderItems.length,
      });
      return NextResponse.json(
        { error: `Error al crear items: ${itemsError.message}` },
        { status: 500 },
      );
    }

    console.info("[create-order] order", order.id, total_cents);

    return NextResponse.json({
      order_id: order.id,
      total_cents,
      currency: "mxn",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    console.warn("[create-order]", errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 },
    );
  }
}
