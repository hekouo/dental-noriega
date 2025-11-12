import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createActionSupabase } from "@/lib/supabase/server-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type OrderItem = {
  id: string;
  title: string;
  price: number; // pesos
  qty: number;
};

type CreateOrderRequest = {
  items: OrderItem[];
  total_cents: number;
  user_id?: string; // opcional, si hay sesión
};

function validateOrderRequest(body: unknown): CreateOrderRequest | null {
  if (!body || typeof body !== "object") return null;
  const req = body as Partial<CreateOrderRequest>;

  if (!Array.isArray(req.items) || req.items.length === 0) return null;
  for (const item of req.items) {
    if (
      typeof item.id !== "string" ||
      typeof item.title !== "string" ||
      typeof item.price !== "number" ||
      typeof item.qty !== "number" ||
      item.qty < 1
    ) {
      return null;
    }
  }

  if (typeof req.total_cents !== "number" || req.total_cents < 0) return null;

  return req as CreateOrderRequest;
}

export async function POST(req: NextRequest) {
  noStore();
  try {
    const body = await req.json().catch(() => null);
    const orderData = validateOrderRequest(body);

    if (!orderData) {
      return NextResponse.json(
        { error: "Datos de orden inválidos" },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Configuración de Supabase faltante" },
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
        subtotal: orderData.total_cents / 100,
        total: orderData.total_cents / 100,
        status: "pending",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: `Error al crear orden: ${orderError?.message}` },
        { status: 500 },
      );
    }

    // Crear items de la orden
    const orderItems = orderData.items.map((item) => ({
      order_id: order.id,
      sku: item.id,
      name: item.title,
      price: item.price,
      qty: item.qty,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Limpiar orden si fallan los items
      await supabase.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        { error: `Error al crear items: ${itemsError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      order_id: order.id,
      total_cents: orderData.total_cents,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

