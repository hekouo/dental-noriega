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

    // Si el frontend llama sin items, intentar reconstruir desde el estado del cliente
    if (!orderData.items || orderData.items.length === 0) {
      // Intentar leer desde body si viene ddn_checkout o ddn_cart
      const checkoutState = (body as any).ddn_checkout;
      const cartState = (body as any).ddn_cart;
      
      if (checkoutState?.items && Array.isArray(checkoutState.items)) {
        orderData.items = checkoutState.items.map((item: any) => ({
          id: item.id || item.sku,
          qty: item.qty || item.quantity || 1,
          price_cents: Math.round((item.price || 0) * 100),
        }));
      } else if (cartState?.cartItems && Array.isArray(cartState.cartItems)) {
        orderData.items = cartState.cartItems.map((item: any) => ({
          id: item.id || item.sku,
          qty: item.qty || item.quantity || 1,
          price_cents: Math.round((item.price || 0) * 100),
        }));
      }
      
      if (!orderData.items || orderData.items.length === 0) {
        return NextResponse.json(
          { error: "No se encontraron items para procesar" },
          { status: 422 },
        );
      }
    }

    // Calcular total_cents
    const total_cents = orderData.items.reduce(
      (sum, item) => sum + item.qty * item.price_cents,
      0,
    );

    if (total_cents <= 0) {
      return NextResponse.json(
        { error: "El total debe ser mayor a 0" },
        { status: 422 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Si Supabase no está configurado, generar un order_id temporal para que Stripe funcione
    if (!supabaseUrl || !serviceRoleKey) {
      const crypto = await import("crypto");
      const tempOrderId = crypto.randomUUID();
      
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

    // Crear orden
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user_id,
        subtotal: total_cents / 100,
        total: total_cents / 100,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.warn("[create-order] Error al crear orden:", orderError?.message);
      return NextResponse.json(
        { error: `Error al crear orden: ${orderError?.message || "Error desconocido"}` },
        { status: 500 },
      );
    }

    // Crear items de la orden
    const orderItems = orderData.items.map((item) => ({
      order_id: order.id,
      sku: item.id,
      name: `Item ${item.id}`, // Fallback si no hay title
      price: item.price_cents / 100,
      qty: item.qty,
    }));

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
