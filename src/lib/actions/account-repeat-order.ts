"use server";

import { z } from "zod";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { getOrderWithItems } from "@/lib/supabase/orders.server";
import { normalizeEmail } from "@/lib/supabase/orders.server";

const RepeatOrderInputSchema = z.object({
  orderId: z.string().uuid("OrderId debe ser un UUID válido"),
});

type RepeatOrderResult =
  | { ok: true; redirectTo: "/carrito" }
  | { ok: false; code: "unauthenticated" | "order-not-found" | "order-not-owned" | "no-items" | "cart-error" };

/**
 * Repite un pedido anterior agregando sus productos al carrito actual
 * @param input - Objeto con orderId
 * @returns Resultado de la operación
 */
export async function repeatOrderAction(
  input: unknown,
): Promise<RepeatOrderResult> {
  // Validar input
  const parsed = RepeatOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[repeatOrderAction] Input inválido:", parsed.error);
    return { ok: false, code: "order-not-found" };
  }

  const { orderId } = parsed.data;

  try {
    // 1. Obtener usuario actual
    const supabase = createActionSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      console.warn("[repeatOrderAction] Usuario no autenticado:", authError?.message);
      return { ok: false, code: "unauthenticated" };
    }

    const userEmail = normalizeEmail(user.email);
    if (!userEmail) {
      console.warn("[repeatOrderAction] Email del usuario inválido");
      return { ok: false, code: "unauthenticated" };
    }

    // 2. Obtener la orden y sus items
    const order = await getOrderWithItems(orderId, userEmail);

    if (!order) {
      console.warn("[repeatOrderAction] Orden no encontrada:", { orderId, userEmail });
      return { ok: false, code: "order-not-found" };
    }

    // 3. Validar que la orden pertenece al usuario
    const orderEmail = normalizeEmail(order.email);
    if (orderEmail !== userEmail) {
      console.warn("[repeatOrderAction] Orden no pertenece al usuario:", {
        orderId,
        userEmail,
        orderEmail,
      });
      return { ok: false, code: "order-not-owned" };
    }

    // 4. Validar que hay items
    if (!order.items || order.items.length === 0) {
      console.warn("[repeatOrderAction] Orden sin items:", { orderId });
      return { ok: false, code: "no-items" };
    }

    // 5. Preparar items para el carrito
    // Los items se devolverán al cliente para que los agregue al store
    // Por ahora solo validamos y devolvemos éxito
    // El cliente se encargará de agregar los items al carrito usando addToCart

    // Log para debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[repeatOrderAction] Orden válida, items preparados:", {
        orderId,
        itemsCount: order.items.length,
      });
    }

    return { ok: true, redirectTo: "/carrito" };
  } catch (error) {
    console.error("[repeatOrderAction] Error inesperado:", error);
    return { ok: false, code: "cart-error" };
  }
}

/**
 * Obtiene los items de una orden para repetir (helper para el cliente)
 * @param orderId - ID de la orden
 * @returns Items de la orden o null si hay error
 */
export async function getOrderItemsForRepeat(
  orderId: string,
): Promise<Array<{
  productId: string;
  title: string;
  qty: number;
  price: number;
  price_cents: number;
  image_url?: string | null;
}> | null> {
  try {
    const supabase = createActionSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return null;
    }

    const userEmail = normalizeEmail(user.email);
    if (!userEmail) {
      return null;
    }

    const order = await getOrderWithItems(orderId, userEmail);

    if (!order || !order.items || order.items.length === 0) {
      return null;
    }

    // Validar que la orden pertenece al usuario
    const orderEmail = normalizeEmail(order.email);
    if (orderEmail !== userEmail) {
      return null;
    }

    // Convertir order_items a formato de carrito
    return order.items
      .filter((item) => item.product_id) // Solo items con product_id válido
      .map((item) => ({
        productId: item.product_id!,
        title: item.title,
        qty: item.qty,
        price: item.unit_price_cents / 100, // Convertir centavos a pesos
        price_cents: item.unit_price_cents,
        image_url: item.image_url,
      }));
  } catch (error) {
    console.error("[getOrderItemsForRepeat] Error:", error);
    return null;
  }
}

