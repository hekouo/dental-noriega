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
  orderId: z
    .union([z.string().uuid("OrderId debe ser un UUID válido"), z.literal("")])
    .optional(),
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

    // Logs detallados solo en development
    if (process.env.NODE_ENV === "development") {
      console.log("[api/account/orders] Request recibido:", {
        email: normalizedEmail,
        rawOrderId,
        orderId: orderId || "(no hay)",
        userId: userId || "(no hay)",
        hasOrderId: !!orderId,
      });
    }

    // Si viene orderId normalizado, devolver detalle de una orden
    if (orderId) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[api/account/orders] Buscando detalle de orden:", {
          body: { email: body.email, rawOrderId },
          normalizedEmail,
          orderId,
          orderIdLength: orderId.length,
          orderIdType: typeof orderId,
          rama: "detalle",
        });
      }

      const order = await getOrderWithItems(orderId, normalizedEmail ?? null);

      // Log temporal para debugging
      if (process.env.NODE_ENV !== "production") {
        console.log("[api/account/orders] getOrderWithItems result:", {
          orderId,
          email: normalizedEmail,
          found: !!order,
          itemsCount: order?.items?.length || 0,
          orderEmail: order?.email,
        });
      }

      if (!order) {
        return NextResponse.json(
          { error: "Orden no encontrada o no pertenece a tu cuenta" },
          { status: 404 },
        );
      }

      return NextResponse.json({ order });
    }

    // Si no viene orderId, devolver lista de órdenes
    if (process.env.NODE_ENV === "development") {
      console.log("[api/account/orders] Buscando lista de órdenes:", {
        email: normalizedEmail,
        rama: "lista",
      });
    }

    const orders = await getOrdersByEmail(normalizedEmail ?? null, {
      limit: 20,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[api/account/orders] getOrdersByEmail result:", {
        email: normalizedEmail,
        count: orders?.length || 0,
      });
    }

    // Siempre devolver 200 con orders (nunca 404)
    return NextResponse.json({ orders });
  } catch (error) {
    // Catch final para errores inesperados (parsing, validación, etc.)
    console.error("[api/account/orders] ERROR inesperado:", {
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined,
      name: (error as any)?.name,
    });
    return NextResponse.json(
      { error: "Ocurrió un error al procesar tu solicitud. Intenta de nuevo más tarde." },
      { status: 500 },
    );
  }
}

