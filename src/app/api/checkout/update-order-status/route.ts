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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

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

