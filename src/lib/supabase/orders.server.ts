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
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  if (!normalizedEmail) {
    // Si no hay email pero hay userId, por ahora lanzar error (en el futuro se podría obtener el email de la sesión)
    if (options?.userId) {
      throw new Error("Email requerido para obtener órdenes");
    }
    // Si no hay ni email ni userId, lanzar error
    throw new Error("Email requerido para obtener órdenes");
  }

  let query = supabase
    .from("orders")
    .select("id, created_at, status, contact_email, total_cents, metadata")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Solo buscar por email, sin OR con user_id
  if (normalizedEmail) {
    query = query.eq("contact_email", normalizedEmail);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingTableError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getOrdersByEmail] Tabla orders no disponible. Se devuelve lista vacía.");
      }
      return [];
    }
    // Para otros errores, loguear y lanzar Error enriquecido
    console.error("[getOrdersByEmail] Error de Supabase:", {
      email: normalizedEmail,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    const enrichedError = new Error(`Error al obtener órdenes: ${error.message}`);
    (enrichedError as Error & { code?: string }).code = error.code;
    throw enrichedError;
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
 * @param orderRef - ID de la orden (UUID) o stripe_session_id
 * @param email - Email del usuario (para verificación de seguridad)
 * @param userId - ID del usuario (opcional, no se usa en la query pero se acepta para compatibilidad)
 * @returns Orden completa con items, o null si no existe o no pertenece al email
 */
export async function getOrderWithItems(
  orderRef: string,
  email?: string | null,
  userId?: string | null,
): Promise<OrderDetail | null> {
  const supabase = createServiceRoleSupabase();
  const normalizedEmail = email?.trim().toLowerCase() ?? null;

  if (!normalizedEmail && !userId) {
    throw new Error("Email o userId requeridos para obtener una orden");
  }

  // Paso 1: Intentar buscar por id (UUID)
  let baseQuery = supabase
    .from("orders")
    .select("id, created_at, status, contact_email, total_cents, metadata")
    .eq("id", orderRef)
    .single();

  let { data: orderData, error: orderError } = await baseQuery;

  // Si no se encontró por id, intentar buscar por stripe_session_id
  if (orderError?.code === "PGRST116" || !orderData) {
    if (process.env.NODE_ENV === "development") {
      console.log("[getOrderWithItems] No encontrado por id, intentando buscar por stripe_session_id:", orderRef);
    }
    
    baseQuery = supabase
      .from("orders")
      .select("id, created_at, status, contact_email, total_cents, metadata")
      .eq("stripe_session_id", orderRef)
      .single();

    const { data: orderDataBySession, error: orderErrorBySession } = await baseQuery;
    
    if (orderDataBySession && !orderErrorBySession) {
      // Encontrado por stripe_session_id
      orderData = orderDataBySession;
      orderError = null;
      if (process.env.NODE_ENV === "development") {
        console.log("[getOrderWithItems] Encontrado por stripe_session_id:", orderData.id);
      }
    } else {
      // No encontrado ni por id ni por stripe_session_id
      orderData = null;
      orderError = orderErrorBySession || orderError;
    }
  }

  if (orderError || !orderData) {
    if (orderError && isMissingTableError(orderError)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getOrderWithItems] Tabla orders no disponible. Devolviendo null.");
      }
      return null;
    }
    if (orderError?.code === "PGRST116") {
      // No rows found - caso normal, orden no encontrada
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[getOrderWithItems] Orden ${orderRef} no encontrada`,
        );
      }
      return null;
    }
    // Para otros errores, loguear y lanzar Error enriquecido
    console.error("[getOrderWithItems] Error de Supabase al obtener orden:", {
      orderRef,
      email: normalizedEmail,
      code: orderError?.code,
      message: orderError?.message,
      details: orderError?.details,
      hint: orderError?.hint,
    });
    const enrichedError = new Error(
      `Error al obtener orden ${orderRef}: ${orderError?.message || "desconocido"}`,
    );
    (enrichedError as Error & { code?: string }).code = orderError?.code;
    throw enrichedError;
  }

  // Verificar que el email coincida (en memoria, no en la query)
  if (normalizedEmail && orderData.contact_email) {
    const orderEmail = orderData.contact_email.trim().toLowerCase();
    if (orderEmail !== normalizedEmail) {
      // El email no coincide, devolver null
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `[getOrderWithItems] Orden ${orderRef} no pertenece al email ${normalizedEmail} (orden tiene ${orderData.contact_email})`,
        );
      }
      return null;
    }
  }

  // Obtener los items de la orden (usar el id real de la orden encontrada)
  const realOrderId = orderData.id;
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, title, qty, unit_price_cents, image_url")
    .eq("order_id", realOrderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    if (isMissingTableError(itemsError)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getOrderWithItems] Tabla order_items no disponible. Continuando sin items.");
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
    } else {
      // Para otros errores, loguear y lanzar Error enriquecido
      console.error("[getOrderWithItems] Error al obtener items:", itemsError);
      const enrichedError = new Error(
        `Error al obtener items de orden ${realOrderId}: ${itemsError.message}`,
      );
      (enrichedError as Error & { code?: string }).code = itemsError.code;
      throw enrichedError;
    }
  }

  // Log temporal para debugging
  if (process.env.NODE_ENV === "development") {
    console.log("[getOrderWithItems] Resultado:", {
      orderRefOriginal: orderRef,
      orderIdReal: orderData.id,
      email: normalizedEmail,
      itemsCount: itemsData?.length || 0,
      found: !!orderData,
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

