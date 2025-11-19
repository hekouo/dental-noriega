import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const BodySchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["paid", "pending", "failed", "processing"]),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { order_id, status } = BodySchema.parse(json);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // Si Supabase no está configurado, retornar éxito igualmente
      return NextResponse.json({ success: true });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Si el status cambia a "paid", procesar puntos de lealtad
    // El helper processLoyaltyForOrder es idempotente y maneja todo el flujo
    if (status === "paid") {
      try {
        const { processLoyaltyForOrder } = await import("@/lib/loyalty/processOrder.server");
        await processLoyaltyForOrder(order_id);
      } catch (loyaltyError) {
        // No fallar la actualización si falla la lógica de puntos
        console.error("[update-order-status] Error al procesar puntos:", loyaltyError);
      }
    }

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", order_id);

    if (error) {
      console.error("[update-order-status] Error:", error);
      return NextResponse.json(
        { error: "Error al actualizar el estado de la orden" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[update-order-status] Error:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 },
    );
  }
}

