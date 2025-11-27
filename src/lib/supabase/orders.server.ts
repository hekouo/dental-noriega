import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Tipos para órdenes y items
 */
export type OrderSummary = {
  id: string; // UUID completo de Supabase
  shortId: string; // Versión truncada para mostrar en UI (ej: "702693b3…")
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
  ownedByEmail?: boolean | null; // true si el email coincide, false si no, null si no se puede determinar
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
 * Normaliza un email: trim y lowercase
 */
function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

/**
 * Obtiene las órdenes de un usuario
 * @param userId - ID del usuario (opcional, prioridad si está presente)
 * @param email - Email del usuario (fallback si no hay userId)
 * @param options - Opciones de consulta (limit por defecto 10)
 * @returns Lista de órdenes resumidas (sin items)
 * 
 * FLUJO ACTUAL:
 * - Si hay userId: busca por user_id (órdenes de usuarios autenticados)
 * - Si no hay userId pero hay email: busca por email (guest checkout)
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
    .select("id, created_at, status, email, total_cents, metadata")
    .eq("email", normalizedEmail)
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
    id: order.id, // UUID completo - NUNCA truncar
    shortId: `${order.id.slice(0, 8)}…`, // Versión truncada solo para UI
    created_at: order.created_at,
    status: order.status,
    email: order.email || normalizedEmail || "",
    total_cents: order.total_cents,
    metadata: (order.metadata as OrderSummary["metadata"]) || null,
  }));
}

/**
 * Obtiene una orden específica con sus items
 * @param orderId - ID de la orden (UUID)
 * @param email - Email del usuario (opcional, para calcular ownedByEmail)
 * @returns Orden completa con items, o null si no existe
 */
export async function getOrderWithItems(
  orderId: string,
  email?: string | null,
): Promise<OrderDetail | null> {
  const supabase = createServiceRoleSupabase();

  // Si orderId está vacío, devolver null directamente
  if (!orderId || orderId.trim().length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getOrderWithItems] orderId vacío, devolviendo null");
    }
    return null;
  }

  const normalizedOrderId = orderId.trim();
  const normalizedEmail = normalizeEmail(email);

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[getOrderWithItems] Iniciando búsqueda:", {
        orderId: normalizedOrderId,
        orderIdLength: normalizedOrderId.length,
        normalizedEmail,
      });
    }

    // Buscar orden por id (UNA sola búsqueda)
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("id, created_at, status, email, total_cents, metadata")
      .eq("id", normalizedOrderId)
      .maybeSingle();

    if (error) {
      // Si es tabla faltante → log y return null
      if (isMissingTableError(error)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[getOrderWithItems] Tabla orders no disponible. Devolviendo null.");
        }
        return null;
      }
      // Para cualquier otro error → log y return null
      console.error("[getOrderWithItems] Error al buscar orden:", {
        orderId: normalizedOrderId,
        code: error.code,
        message: error.message,
      });
      return null;
    }

    // Si la orden no existe, devolver null
    if (!orderData) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[getOrderWithItems] Orden no encontrada:", {
          orderId: normalizedOrderId,
        });
      }
      return null;
    }

    // Calcular ownedByEmail
    const normalizedOrderEmail = normalizeEmail(orderData.email);
    let ownedByEmail: boolean | null = null;
    if (normalizedEmail && normalizedOrderEmail) {
      ownedByEmail = normalizedEmail === normalizedOrderEmail;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("[getOrderWithItems] Orden encontrada:", {
        orderId: normalizedOrderId,
        orderDataEmail: orderData.email,
        normalizedEmail,
        ownedByEmail,
      });
    }

    // Cargar items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, title, qty, unit_price_cents, image_url")
      .eq("order_id", orderData.id);

    if (itemsError) {
      console.error("[getOrderWithItems] Error al leer order_items:", {
        orderId: orderData.id,
        error: itemsError.message,
        code: itemsError.code,
      });
    }

    const items = itemsData || [];

    return {
      id: orderData.id, // UUID completo - NUNCA truncar
      shortId: `${orderData.id.slice(0, 8)}…`, // Versión truncada solo para UI
      created_at: orderData.created_at,
      status: orderData.status,
      email: orderData.email || normalizedEmail || "",
      total_cents: orderData.total_cents,
      metadata: (orderData.metadata as OrderSummary["metadata"]) || null,
      items,
      ownedByEmail, // Flag que indica si el email coincide (true/false/null)
    };
  } catch (err) {
    console.error("[getOrderWithItems] Error inesperado:", err);
    return null;
  }
}

