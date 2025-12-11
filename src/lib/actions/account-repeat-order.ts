"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createActionSupabase } from "@/lib/supabase/server-actions";
import { getOrderWithItems } from "@/lib/supabase/orders.server";
import { getOrCreateCartForUser } from "@/lib/cart/getOrCreateCart.server";
import { createClient } from "@supabase/supabase-js";

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 */
function createServiceRoleSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan variables de Supabase (URL o SERVICE_ROLE_KEY)");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

const RepeatOrderInputSchema = z.object({
  orderId: z.string().uuid("OrderId debe ser un UUID válido"),
});

type RepeatOrderResult =
  | { ok: true; redirectTo: string }
  | { ok: false; code: "unauthenticated" | "order-not-found" | "cart-error" | "invalid-input" };

/**
 * Repite un pedido anterior agregando sus productos al carrito actual
 * @param input Objeto con orderId
 * @returns Resultado de la operación
 */
export async function repeatOrderAction(
  input: z.infer<typeof RepeatOrderInputSchema>,
): Promise<RepeatOrderResult> {
  // Validar input
  const validationResult = RepeatOrderInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error("[repeatOrderAction] Input inválido:", validationResult.error);
    return { ok: false, code: "invalid-input" };
  }

  const { orderId } = validationResult.data;

  try {
    // 1. Obtener usuario actual
    const authSupabase = createActionSupabase();
    const {
      data: { user },
      error: authError,
    } = await authSupabase.auth.getUser();

    if (authError || !user) {
      console.warn("[repeatOrderAction] Usuario no autenticado");
      return { ok: false, code: "unauthenticated" };
    }

    const userId = user.id;
    const userEmail = user.email;

    // 2. Obtener la orden y sus items
    const order = await getOrderWithItems(orderId, userEmail || null);

    if (!order) {
      console.warn("[repeatOrderAction] Orden no encontrada:", { orderId, userEmail });
      return { ok: false, code: "order-not-found" };
    }

    // 3. Validar que la orden pertenece al usuario
    if (order.ownedByEmail === false) {
      console.warn("[repeatOrderAction] Orden no pertenece al usuario:", {
        orderId,
        orderEmail: order.email,
        userEmail,
      });
      return { ok: false, code: "order-not-found" };
    }

    // 4. Obtener o crear el carrito del usuario
    const cartId = await getOrCreateCartForUser(authSupabase, userId);

    if (!cartId) {
      console.error("[repeatOrderAction] Error al obtener/crear carrito:", { userId });
      return { ok: false, code: "cart-error" };
    }

    // 5. Obtener productos activos para validar
    const serviceSupabase = createServiceRoleSupabase();
    const productIds = order.items.map((item) => item.product_id).filter(Boolean);
    
    let activeProducts: Set<string> = new Set();
    if (productIds.length > 0) {
      const { data: products } = await serviceSupabase
        .from("api_catalog_with_images")
        .select("id")
        .in("id", productIds)
        .eq("active", true);

      if (products) {
        activeProducts = new Set(products.map((p) => p.id));
      }
    }

    // 6. Agregar items al carrito
    const itemsToAdd = order.items.filter((item) => {
      // Solo agregar si el producto existe y está activo
      if (!item.product_id) return false;
      return activeProducts.has(item.product_id);
    });

    if (itemsToAdd.length === 0) {
      console.warn("[repeatOrderAction] No hay productos válidos para agregar:", { orderId });
      // Aún así redirigir al carrito (puede que ya tenga otros items)
      revalidatePath("/carrito");
      return { ok: true, redirectTo: "/carrito" };
    }

    // Obtener items existentes en el carrito para sumar cantidades
    const { data: existingItems } = await authSupabase
      .from("cart_items")
      .select("sku, qty")
      .eq("cart_id", cartId);

    const existingItemsMap = new Map(
      (existingItems || []).map((item) => [item.sku, item.qty]),
    );

    // Preparar items para upsert
    const cartItemsToUpsert = itemsToAdd.map((item) => {
      const existingQty = existingItemsMap.get(item.product_id) || 0;
      const newQty = existingQty + item.qty;

      return {
        cart_id: cartId,
        sku: item.product_id,
        name: item.title,
        price: item.unit_price_cents / 100, // Convertir centavos a pesos
        qty: newQty,
      };
    });

    // Separar en updates e inserts
    const toUpdate = cartItemsToUpsert.filter((item) =>
      existingItemsMap.has(item.sku),
    );
    const toInsert = cartItemsToUpsert.filter(
      (item) => !existingItemsMap.has(item.sku),
    );

    // Actualizar items existentes
    for (const item of toUpdate) {
      const { error: updateError } = await authSupabase
        .from("cart_items")
        .update({ qty: item.qty, price: item.price })
        .eq("cart_id", cartId)
        .eq("sku", item.sku);

      if (updateError) {
        console.error("[repeatOrderAction] Error al actualizar item:", {
          cartId,
          sku: item.sku,
          error: updateError.message,
        });
        // Continuar con los demás items
      }
    }

    // Insertar nuevos items
    if (toInsert.length > 0) {
      const { error: insertError } = await authSupabase
        .from("cart_items")
        .insert(toInsert);

      if (insertError) {
        console.error("[repeatOrderAction] Error al insertar items:", {
          cartId,
          error: insertError.message,
        });
        return { ok: false, code: "cart-error" };
      }
    }

    // Revalidar páginas relevantes
    revalidatePath("/carrito");
    revalidatePath("/cuenta/pedidos");

    return { ok: true, redirectTo: "/carrito" };
  } catch (error) {
    console.error("[repeatOrderAction] Error inesperado:", error);
    return { ok: false, code: "cart-error" };
  }
}

