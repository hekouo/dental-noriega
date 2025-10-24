import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  // Solo en desarrollo
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("id");

  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Verificar si la orden existe
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ 
        ok: false, 
        exists: false,
        error: orderError?.message 
      });
    }

    // Contar items
    const { count: itemsCount, error: countError } = await supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("order_id", orderId);

    return NextResponse.json({
      ok: true,
      exists: true,
      itemsCount: itemsCount || 0,
      total: order.total,
      status: order.status,
      customer_email: order.customer_email,
      created_at: order.created_at
    });

  } catch (error) {
    console.error("[API] Orders diagnostic error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: "Internal server error" 
    }, { status: 500 });
  }
}
