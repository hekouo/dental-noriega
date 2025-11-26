import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Tipos para órdenes y items
 */
export type OrderSummary = {
  id: string;
  created_at: string;
  status: string;
  email: string;
  total_cents: number | null;
  metadata: {
    shipping_method?: string;
    shipping_cost_cents?: number;
    coupon_code?: string;
    subtotal_cents?: number;
    discount_cents?: number;
    contact_name?: string;
    contact_email?: string;
    loyalty_points_earned?: number | null;
    loyalty_points_spent?: number | null;
    loyalty_points_balance_after?: number | null;
  } | null;
};

export type OrderItem = {
  id: string;
  product_id: string | null;
  title: string;
  qty: number;
  unit_price_cents: number;
  image_url: string | null;
};

export type OrderDetail = OrderSummary & {
  items: OrderItem[];
};

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 * Reutiliza el mismo patrón que los endpoints de checkout
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

const isMissingTableError = (error?: PostgrestError | null) => {
  const code = error?.code;
  return code === "PGRST205" || code === "42P01"; // 42P01 = PostgreSQL "relation does not exist"
};

/**
 * Obtiene las órdenes de un usuario
 * @param userId - ID del usuario (opcional, prioridad si está presente)
 * @param email - Email del usuario (fallback si no hay userId)
 * @param options - Opciones de consulta (limit por defecto 10)
 * @returns Lista de órdenes resumidas (sin items)
 * 
 * FLUJO ACTUAL:
 * - Si hay userId: busca por user_id (órdenes de usuarios autenticados)
 * - Si no hay userId pero hay email: busca por contact_email (guest checkout)
 * - Mantiene compatibilidad con pedidos históricos por email
 */
export async function getOrdersByEmail(
  email?: string | null,
  options?: { limit?: number; userId?: string | null },
): Promise<OrderSummary[]> {
  const supabase = createServiceRoleSupabase();
  const limit = options?.limit ?? 10;
  const userId = options?.userId;
  // Normalizar email para logging (aunque no se use si hay userId)
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  if (!userId && !normalizedEmail) {
    // No lanzar error, devolver lista vacía (la API validará antes de llamar)
    console.warn("[getOrdersByEmail] Sin userId ni email. Devolviendo lista vacía.");
    return [];
  }

  let query = supabase
    .from("orders")
    .select("id, created_at, status, contact_email, total_cents, metadata, user_id");

  // Prioridad: buscar por user_id si está disponible (usuarios autenticados)
  if (userId) {
    query = query.eq("user_id", userId);
  } else if (normalizedEmail) {
    // Fallback: buscar por contact_email (guest checkout o pedidos históricos)
    query = query.eq("contact_email", normalizedEmail);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      console.warn("[getOrdersByEmail] Tabla orders no disponible. Se devuelve lista vacía.");
      return [];
    }
    if (error.code === "PGRST116") {
      // No rows found - caso normal, devolver lista vacía
      return [];
    }
    // Para otros errores, loguear pero devolver lista vacía en vez de lanzar
    console.error("[getOrdersByEmail] Error de Supabase:", {
      userId,
      email: normalizedEmail,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    // No lanzar, devolver lista vacía para evitar 500
    return [];
  }

  // Log temporal para debugging
  if (process.env.NODE_ENV === "development" && data && data.length > 0) {
    console.log("[getOrdersByEmail] Resultado completo (primer pedido):", {
      userId,
      email: normalizedEmail,
      count: data.length,
      firstOrder: {
        id: data[0].id,
        status: data[0].status,
        created_at: data[0].created_at,
        total_cents: data[0].total_cents,
        metadata: data[0].metadata,
        metadata_shipping_cost_cents: (data[0].metadata as Record<string, unknown>)?.shipping_cost_cents,
        metadata_shipping_method: (data[0].metadata as Record<string, unknown>)?.shipping_method,
      },
    });
  }

  return (data || []).map((order) => ({
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    email: order.contact_email || normalizedEmail || "",
    total_cents: order.total_cents,
    metadata: (order.metadata as OrderSummary["metadata"]) || null,
  }));
}

/**
 * Obtiene una orden específica con sus items, verificando que pertenezca al usuario o email
 * @param orderId - ID de la orden
 * @param email - Email del usuario (para verificación de seguridad)
 * @param userId - ID del usuario (opcional, prioridad si está presente)
 * @returns Orden completa con items, o null si no existe o no pertenece al usuario/email
 * 
 * FLUJO ACTUAL:
 * - Si hay userId: verifica que la orden pertenezca al user_id
 * - Si no hay userId pero hay email: verifica que la orden pertenezca al contact_email
 * - Mantiene compatibilidad con pedidos históricos por email
 */
export async function getOrderWithItems(
  orderId: string,
  email?: string | null,
  userId?: string | null,
): Promise<OrderDetail | null> {
  const supabase = createServiceRoleSupabase();
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  if (!userId && !normalizedEmail) {
    // No lanzar error, devolver null (la API validará antes de llamar)
    console.warn("[getOrderWithItems] Sin userId ni email. Devolviendo null.");
    return null;
  }

  let query = supabase
    .from("orders")
    .select("id, created_at, status, contact_email, total_cents, metadata, user_id")
    .eq("id", orderId);

  // Prioridad: verificar por user_id si está disponible
  if (userId) {
    query = query.eq("user_id", userId);
  } else if (normalizedEmail) {
    // Fallback: verificar por contact_email
    query = query.eq("contact_email", normalizedEmail);
  }

  const { data: orderData, error: orderError } = await query.single();

  if (orderError || !orderData) {
    if (orderError && isMissingTableError(orderError)) {
      console.warn("[getOrderWithItems] Tabla orders no disponible. Devolviendo null.");
      return null;
    }
    if (orderError?.code === "PGRST116") {
      // No rows found - caso normal, orden no encontrada
      console.warn(
        `[getOrderWithItems] Orden ${orderId} no encontrada para ${
          userId ? `user_id ${userId}` : `email ${normalizedEmail}`
        }`,
      );
      return null;
    }
    // Para otros errores, loguear pero devolver null en vez de lanzar
    console.error("[getOrderWithItems] Error de Supabase al obtener orden:", {
      orderId,
      userId,
      email: normalizedEmail,
      code: orderError?.code,
      message: orderError?.message,
      details: orderError?.details,
      hint: orderError?.hint,
    });
    // No lanzar, devolver null para evitar 500
    return null;
  }

  // Obtener los items de la orden
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, title, qty, unit_price_cents, image_url")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    if (isMissingTableError(itemsError)) {
      console.warn("[getOrderWithItems] Tabla order_items no disponible. Continuando sin items.");
    } else {
      console.error("[getOrderWithItems] Error al obtener items:", itemsError);
    }
    return {
      id: orderData.id,
      created_at: orderData.created_at,
      status: orderData.status,
      email: orderData.contact_email || normalizedEmail || "",
      total_cents: orderData.total_cents,
      metadata: (orderData.metadata as OrderSummary["metadata"]) || null,
      items: [],
    };
  }

  // Log temporal para debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[getOrderWithItems] Resultado:", {
      orderId,
      email: normalizedEmail,
      itemsCount: itemsData?.length || 0,
    });
  }

  return {
    id: orderData.id,
    created_at: orderData.created_at,
    status: orderData.status,
    email: orderData.contact_email || normalizedEmail, // Usar contact_email o el email proporcionado
    total_cents: orderData.total_cents,
    metadata: (orderData.metadata as OrderSummary["metadata"]) || null,
    items: (itemsData || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      title: item.title,
      qty: item.qty,
      unit_price_cents: item.unit_price_cents,
      image_url: item.image_url,
    })),
  };
}

