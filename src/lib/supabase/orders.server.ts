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
  email: string | null,
  options?: { limit?: number },
): Promise<OrderSummary[]> {
  const supabase = createServiceRoleSupabase();
  const limit = options?.limit ?? 10;
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  // Si no hay email, log en dev y devolver lista vacía (NO throw)
  if (!normalizedEmail) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getOrdersByEmail] Sin email. Devolviendo lista vacía.");
    }
    return [];
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, status, contact_email, total_cents, metadata")
    .eq("contact_email", normalizedEmail)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingTableError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getOrdersByEmail] Tabla orders no disponible. Se devuelve lista vacía.");
      }
      return [];
    }
    // Para cualquier otro error, loguear y devolver lista vacía (NO throw)
    console.error("[getOrdersByEmail] Error de Supabase:", {
      email: normalizedEmail,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  // Log temporal para debugging
  if (process.env.NODE_ENV === "development" && data && data.length > 0) {
    console.log("[getOrdersByEmail] Resultado completo (primer pedido):", {
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
 * Obtiene una orden específica con sus items, verificando que pertenezca al email
 * @param orderId - ID de la orden (UUID) o stripe_session_id
 * @param email - Email del usuario (opcional, para verificación de seguridad)
 * @returns Orden completa con items, o null si no existe o no pertenece al email
 */
export async function getOrderWithItems(
  orderId: string,
  email?: string | null,
): Promise<OrderDetail | null> {
  const supabase = createServiceRoleSupabase();
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  try {
    // Buscar primero por id
    let { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, created_at, status, contact_email, total_cents, metadata, stripe_session_id")
      .eq("id", orderId)
      .single();

    // Si no se encontró por id, intentar buscar por stripe_session_id
    if (orderError || !orderData) {
      const { data: byStripe, error: stripeError } = await supabase
        .from("orders")
        .select("id, created_at, status, contact_email, total_cents, metadata, stripe_session_id")
        .eq("stripe_session_id", orderId)
        .single();

      if (stripeError || !byStripe) {
        // Si el código es de tabla faltante (PGRST205 / 42P01) → log y return null
        if (stripeError && isMissingTableError(stripeError)) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[getOrderWithItems] Tabla orders no disponible. Devolviendo null.");
          }
          return null;
        }
        // Para cualquier otro error → log y return null
        if (stripeError) {
          console.error("[getOrderWithItems] Error al buscar orden por stripe_session_id:", {
            orderId,
            code: stripeError.code,
            message: stripeError.message,
          });
        }
        return null;
      }

      orderData = byStripe;
      orderError = null;
      if (process.env.NODE_ENV === "development") {
        console.log("[getOrderWithItems] Encontrado por stripe_session_id:", orderData.id);
      }
    }

    // Validar email en memoria, pero sin lanzar
    if (
      normalizedEmail &&
      orderData.contact_email &&
      orderData.contact_email.trim().toLowerCase() !== normalizedEmail
    ) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[getOrderWithItems] Orden ${orderId} no pertenece al email ${normalizedEmail} (orden tiene ${orderData.contact_email})`,
        );
      }
      return null;
    }

    // Cargar items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, title, qty, unit_price_cents, image_url")
      .eq("order_id", orderData.id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      // Si es tabla faltante → log y continuar con items []
      if (isMissingTableError(itemsError)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[getOrderWithItems] Tabla order_items no disponible. Continuando sin items.");
        }
      } else {
        // Si es otro error → log y continuar con items []
        console.error("[getOrderWithItems] Error al obtener items:", {
          orderId: orderData.id,
          code: itemsError.code,
          message: itemsError.message,
        });
      }
    }

    const items = itemsData || [];

    // Log temporal para debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[getOrderWithItems] Resultado:", {
        orderIdOriginal: orderId,
        orderIdReal: orderData.id,
        email: normalizedEmail,
        itemsCount: items.length,
        found: !!orderData,
      });
    }

    return {
      id: orderData.id,
      created_at: orderData.created_at,
      status: orderData.status,
      email: orderData.contact_email || normalizedEmail || "",
      total_cents: orderData.total_cents,
      metadata: (orderData.metadata as OrderSummary["metadata"]) || null,
      items,
    };
  } catch (err) {
    console.error("[getOrderWithItems] Error inesperado:", err);
    return null;
  }
}

