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

// Type export for potential future use
export type OrdersRequest = z.infer<typeof OrdersRequestSchema>;

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
    const normalizedEmail = email.trim().toLowerCase();

    // Si viene orderId, devolver detalle de una orden
    if (orderId) {
      try {
        const order = await getOrderWithItems(orderId, normalizedEmail);

        // Log temporal para debugging
        if (process.env.NODE_ENV === "development") {
          console.log("[api/account/orders] getOrderWithItems result:", {
            orderId,
            email: normalizedEmail,
            found: !!order,
            itemsCount: order?.items?.length || 0,
          });
        }

        if (!order) {
          return NextResponse.json(
            { error: "Orden no encontrada o no pertenece a este email" },
            { status: 404 },
          );
        }

        return NextResponse.json({ order });
      } catch (err) {
        console.error("[api/account/orders] Error al obtener orden:", err);
        return NextResponse.json(
          { error: "Ocurrió un error al buscar el pedido. Intenta de nuevo más tarde." },
          { status: 500 },
        );
      }
    }

    // Si no viene orderId, devolver lista de órdenes
    try {
      const orders = await getOrdersByEmail(normalizedEmail, { limit: 20 });

      // Log temporal para debugging
      if (process.env.NODE_ENV === "development") {
        console.log("[api/account/orders] Respuesta:", {
          email: normalizedEmail,
          ordersCount: orders.length,
        });
      }

      return NextResponse.json({ orders });
    } catch (err) {
      console.error("[api/account/orders] Error al obtener órdenes:", err);
      return NextResponse.json(
        { error: "Ocurrió un error al buscar tus pedidos. Intenta de nuevo más tarde." },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[api/account/orders] Error inesperado:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar tu solicitud. Intenta de nuevo más tarde." },
      { status: 500 },
    );
  }
}

