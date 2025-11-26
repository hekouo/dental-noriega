import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import {
  getOrdersByEmail,
  getOrderWithItems,
} from "@/lib/supabase/orders.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OrdersRequestSchema = z.object({
  email: z.string().email("Email inválido").optional(),
  orderId: z.union([
    z.string().uuid("OrderId debe ser un UUID válido"),
    z.literal(""),
  ]).optional(),
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

    const { email, orderId: rawOrderId } = validationResult.data;

    // Normalizar orderId: solo usar si es string no vacío
    const orderId =
      typeof rawOrderId === "string" && rawOrderId.trim().length > 0
        ? rawOrderId.trim()
        : undefined;

    // Intentar obtener user_id de la sesión (si el usuario está autenticado)
    let userId: string | null = null;
    try {
      const authSupabase = createActionSupabase();
      const {
        data: { user },
      } = await authSupabase.auth.getUser();
      userId = user?.id ?? null;
    } catch (err) {
      // Si no hay sesión, continuar como guest (userId = null, buscar por email)
      if (process.env.NODE_ENV === "development") {
        console.debug("[api/account/orders] No hay sesión activa:", err);
      }
    }

    // Validar que haya al menos userId o email válido
    const normalizedEmail = email?.trim().toLowerCase() || null;
    if (!userId && !normalizedEmail) {
      return NextResponse.json(
        { error: "Email requerido o sesión activa" },
        { status: 400 },
      );
    }

    // Si hay email pero no es válido, devolver error
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 },
      );
    }

    // Si viene orderId normalizado, devolver detalle de una orden
    if (orderId) {
      try {
        // Para getOrderWithItems, necesitamos un email (puede ser el del usuario autenticado o el proporcionado)
        const emailForOrder = normalizedEmail || (userId ? `user-${userId}@temp.local` : null);
        if (!emailForOrder) {
          return NextResponse.json(
            { error: "Email requerido para buscar una orden específica" },
            { status: 400 },
          );
        }

        const order = await getOrderWithItems(orderId, emailForOrder, userId);

        // Log temporal para debugging
        if (process.env.NODE_ENV === "development") {
          console.log("[api/account/orders] getOrderWithItems result:", {
            orderId,
            userId,
            email: normalizedEmail,
            found: !!order,
            itemsCount: order?.items?.length || 0,
          });
        }

        if (!order) {
          return NextResponse.json(
            { error: "Orden no encontrada o no pertenece a tu cuenta" },
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
      // Si hay userId, podemos buscar sin email (la función prioriza userId)
      // Si no hay userId, necesitamos email
      if (!userId && !normalizedEmail) {
        return NextResponse.json(
          { error: "Email requerido o sesión activa" },
          { status: 400 },
        );
      }

      // Si hay userId pero no email, usar un email dummy (no se usará porque la función prioriza userId)
      const emailForQuery = normalizedEmail || (userId ? "dummy@temp.local" : "");
      
      const orders = await getOrdersByEmail(emailForQuery, { 
        limit: 20,
        userId: userId, // Pasar userId si está disponible (prioridad)
      });

      // Log temporal para debugging
      if (process.env.NODE_ENV === "development") {
        console.log("[api/account/orders] Respuesta:", {
          userId,
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

