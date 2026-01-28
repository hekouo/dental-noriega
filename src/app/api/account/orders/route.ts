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

// Helper: Normalizar orderId
function normalizeOrderId(rawOrderId: string | undefined): string | undefined {
  return typeof rawOrderId === "string" && rawOrderId.trim().length > 0
    ? rawOrderId.trim()
    : undefined;
}

// Helper: Obtener userId de sesión
async function getUserIdFromSession(): Promise<string | null> {
  try {
    const authSupabase = createActionSupabase();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

// Helper: Normalizar y validar email
function normalizeEmail(email: string | undefined): string | null {
  const normalized = email?.trim().toLowerCase() || null;
  if (normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

// Helper: Validar que haya userId o email válido
function validateAuth(userId: string | null, email: string | null): boolean {
  return !!(userId || email);
}

// Helper: Manejar request de detalle de orden
async function handleOrderDetail(
  orderId: string,
  normalizedEmail: string | null,
): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[api/account/orders] Buscando detalle de orden:", {
      normalizedEmail,
      orderId,
      orderIdLength: orderId.length,
      orderIdType: typeof orderId,
      rama: "detalle",
    });
  }

  const order = await getOrderWithItems(orderId, normalizedEmail ?? null);

  if (process.env.NODE_ENV !== "production") {
    console.log("[api/account/orders] getOrderWithItems result:", {
      orderId,
      email: normalizedEmail,
      found: !!order,
      itemsCount: order?.items?.length || 0,
      orderEmail: order?.email,
      ownedByEmail: order?.ownedByEmail,
    });
  }

  if (!order) {
    return NextResponse.json(
      { error: "Orden no encontrada" },
      { status: 404 },
    );
  }

  return NextResponse.json({ order });
}

// Helper: Manejar request de lista de órdenes
async function handleOrdersList(
  normalizedEmail: string | null,
): Promise<NextResponse> {
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

  return NextResponse.json({ orders });
}

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

    const orderId = normalizeOrderId(rawOrderId);
    const userId = await getUserIdFromSession();
    const normalizedEmail = normalizeEmail(email);

    if (!validateAuth(userId, normalizedEmail)) {
      return NextResponse.json(
        { error: "Email requerido o sesión activa" },
        { status: 400 },
      );
    }

    if (normalizedEmail === null && email) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 },
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[api/account/orders] Request recibido:", {
        email: normalizedEmail,
        rawOrderId,
        orderId: orderId || "(no hay)",
        userId: userId || "(no hay)",
        hasOrderId: !!orderId,
      });
    }

    if (orderId) {
      return handleOrderDetail(orderId, normalizedEmail);
    }

    return handleOrdersList(normalizedEmail);
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

