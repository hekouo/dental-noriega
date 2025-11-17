import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import {
  getOrdersByEmail,
  getOrderWithItems,
} from "@/lib/supabase/orders.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OrdersRequestSchema = z.object({
  email: z.string().email("Email inválido"),
  orderId: z.string().uuid().optional(),
});

type OrdersRequest = z.infer<typeof OrdersRequestSchema>;

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
    const validationResult = OrdersRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return NextResponse.json(
        { error: `Datos inválidos: ${errors}` },
        { status: 422 },
      );
    }

    const { email, orderId } = validationResult.data;

    // Si viene orderId, devolver detalle de una orden
    if (orderId) {
      const order = await getOrderWithItems(orderId, email);

      if (!order) {
        return NextResponse.json(
          { error: "Orden no encontrada o no pertenece a este email" },
          { status: 404 },
        );
      }

      return NextResponse.json({ order });
    }

    // Si no viene orderId, devolver lista de órdenes
    const orders = await getOrdersByEmail(email, { limit: 20 });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[api/account/orders] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 },
    );
  }
}

