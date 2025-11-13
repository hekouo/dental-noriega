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

    // Crear orden con total_cents persistido
    // Nota: El schema tiene 'total' como numeric(12,2), así que guardamos total = total_cents / 100
    // Si el schema tuviera total_cents INT, lo guardaríamos directamente
    const totalDecimal = total_cents / 100;
    
    // Validar que totalDecimal sea válido antes de insertar
    if (!totalDecimal || totalDecimal <= 0 || !isFinite(totalDecimal)) {
      console.warn("[create-order] Total decimal inválido antes de insertar:", {
        total_cents,
        totalDecimal,
      });
      return NextResponse.json(
        { error: "Total de la orden inválido" },
        { status: 422 },
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user_id,
        subtotal: totalDecimal,
        total: totalDecimal,
        shipping_cost: 0,
        discount_amount: 0,
        fulfillment_method: orderData.shippingMethod || "pickup",
        status: "pending",
      })
      .select("id, total")
      .single();

    if (orderError || !order) {
      console.warn("[create-order] Error al crear orden:", orderError?.message);
      return NextResponse.json(
        { error: `Error al crear orden: ${orderError?.message || "Error desconocido"}` },
        { status: 500 },
      );
    }

    // Verificar que la orden se creó con total válido
    if (!order.total || order.total <= 0) {
      console.warn("[create-order] Orden creada con total inválido:", {
        order_id: order.id,
        total: order.total,
        total_cents,
        totalDecimal,
      });
      // Intentar actualizar el total
      await supabase
        .from("orders")
        .update({ total: totalDecimal, subtotal: totalDecimal })
        .eq("id", order.id);
    }

    // Crear items de la orden con price_cents persistido como price (decimal)
    // Nota: El schema tiene 'price' como numeric(12,2), así que guardamos price = price_cents / 100
    // Si el schema tuviera price_cents INT, lo guardaríamos directamente
    const orderItems = orderData.items.map((item) => {
      const priceDecimal = item.price_cents / 100;
      if (!priceDecimal || priceDecimal <= 0 || !isFinite(priceDecimal)) {
        console.warn("[create-order] Item con precio inválido:", {
          id: item.id,
          price_cents: item.price_cents,
          priceDecimal,
        });
      }
      return {
        order_id: order.id,
        sku: item.id,
        name: `Item ${item.id}`, // Fallback si no hay title
        price: priceDecimal,
        qty: item.qty,
      };
    });

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Limpiar orden si fallan los items
      await supabase.from("orders").delete().eq("id", order.id);
      console.warn("[create-order] Error al crear items:", itemsError.message);
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
