import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  noStore();
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get("order_id");

  if (!orderId) {
    return NextResponse.json({ error: "order_id is required" }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Si Supabase no está configurado, retornar status "pending" para que el cliente pueda continuar
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ status: "pending" });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ status: data?.status || "pending" });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

