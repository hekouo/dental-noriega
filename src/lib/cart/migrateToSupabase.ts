"use client";

import type { PostgrestError } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { CartItem } from "@/lib/store/cartStore";
import { getWithTTL, removeWithTTL, KEYS } from "@/lib/utils/persist";

const isMissingTableError = (error?: PostgrestError | null) => {
  const code = error?.code;
  return code === "PGRST205" || code === "42P01"; // 42P01 = PostgreSQL "relation does not exist"
};

const logMissingTable = (source: string) => {
  if (process.env.NODE_ENV === "development") {
    console.warn(
      `[migrateCartToSupabase] Tabla de carritos/cart_items no disponible (${source}). Se omite migración.`,
    );
  }
};

/**
 * Migra el carrito de localStorage a Supabase cuando el usuario inicia sesión
 */
export async function migrateCartToSupabase(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = getBrowserSupabase();
  if (!supabase) {
    return { success: false, error: "Supabase no disponible" };
  }

  try {
    // Obtener carrito de localStorage
    const localCart = getWithTTL<CartItem[]>(KEYS.CART);
    if (!localCart || localCart.length === 0) {
      return { success: true }; // No hay nada que migrar
    }

    // Obtener o crear cart para el usuario
    let cartId: string | null = null;

    const { data: existingCart, error: cartError } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (cartError) {
      if (isMissingTableError(cartError)) {
        logMissingTable("select carts");
        return { success: true };
      }
      if (cartError.code !== "PGRST116") {
        // PGRST116 = no rows returned, que es esperado si no existe cart
        return { success: false, error: cartError.message };
      }
    }

    if (existingCart) {
      cartId = (existingCart as { id: string }).id;
    } else {
      // Crear nuevo cart
      const { data: newCart, error: createError } = await supabase
        .from("carts")
        .insert({ user_id: userId } as never)
        .select("id")
        .single();

      if (createError || !newCart) {
        if (createError && isMissingTableError(createError)) {
          logMissingTable("insert carts");
          return { success: true };
        }
        return { success: false, error: createError?.message ?? "Error al crear carrito" };
      }
      cartId = (newCart as { id: string }).id;
    }
    if (!cartId) {
      return { success: false, error: "No se pudo crear o obtener el carrito" };
    }

    // Preparar items para upsert (evitar duplicados)
    const cartItems = localCart.map((item) => ({
      cart_id: cartId,
      sku: item.id,
      name: item.title,
      price: item.price,
      qty: item.qty,
    }));

    // Upsert: si existe sku+cart_id, actualizar qty; si no, insertar
    // Primero obtener items existentes
    const { data: existingItems, error: existingItemsError } = await supabase
      .from("cart_items")
      .select("sku, qty")
      .eq("cart_id", cartId)
      .in("sku", cartItems.map((i) => i.sku));

    if (existingItemsError) {
      if (isMissingTableError(existingItemsError)) {
        logMissingTable("select cart_items");
        return { success: true };
      }
      return { success: false, error: existingItemsError.message };
    }

    const existingSkus = new Set(
      (existingItems as Array<{ sku: string; qty: number }> | null)?.map((i) => i.sku) ?? [],
    );

    // Separar en updates e inserts
    const toUpdate = cartItems.filter((item) => existingSkus.has(item.sku));
    const toInsert = cartItems.filter((item) => !existingSkus.has(item.sku));

    // Actualizar existentes
    for (const item of toUpdate) {
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ qty: item.qty, price: item.price } as never)
        .eq("cart_id", cartId)
        .eq("sku", item.sku);

      if (updateError) {
        if (isMissingTableError(updateError)) {
          logMissingTable("update cart_items");
          return { success: true };
        }
        return { success: false, error: updateError.message };
      }
    }

    // Insertar nuevos
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("cart_items")
        .insert(toInsert as never);

      if (insertError) {
        if (isMissingTableError(insertError)) {
          logMissingTable("insert cart_items");
          return { success: true };
        }
        return { success: false, error: insertError.message };
      }
    }

    // Vaciar localStorage después de migrar exitosamente
    removeWithTTL(KEYS.CART);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

