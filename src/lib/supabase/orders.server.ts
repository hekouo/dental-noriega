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
    contact_phone?: string;
    contact_address?: string;
    contact_city?: string;
    contact_state?: string;
    contact_cp?: string;
    loyalty_points_earned?: number | null;
    loyalty_points_spent?: number | null;
    loyalty_points_balance_after?: number | null;
  } | null;
  shipping_provider: string | null;
  shipping_service_name: string | null;
  shipping_price_cents: number | null;
  shipping_rate_ext_id: string | null;
  shipping_eta_min_days: number | null;
  shipping_eta_max_days: number | null;
  shipping_tracking_number: string | null;
  shipping_label_url: string | null;
  shipping_status: string | null;
};

export type ShippingInfo = {
  contact_name: string | null;
  contact_phone: string | null;
  contact_address: string | null;
  contact_city: string | null;
  contact_state: string | null;
  contact_cp: string | null;
  shipping_method: string | null;
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
  shipping?: ShippingInfo; // Información de envío extraída de metadata
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
    .select("id, created_at, status, email, total_cents, metadata, shipping_provider, shipping_service_name, shipping_price_cents, shipping_rate_ext_id, shipping_eta_min_days, shipping_eta_max_days, shipping_tracking_number, shipping_label_url, shipping_status")
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
    shipping_provider: order.shipping_provider || null,
    shipping_service_name: order.shipping_service_name || null,
    shipping_price_cents: order.shipping_price_cents || null,
    shipping_rate_ext_id: order.shipping_rate_ext_id || null,
    shipping_eta_min_days: order.shipping_eta_min_days || null,
    shipping_eta_max_days: order.shipping_eta_max_days || null,
    shipping_tracking_number: order.shipping_tracking_number || null,
    shipping_label_url: order.shipping_label_url || null,
    shipping_status: order.shipping_status || null,
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
      .select("id, created_at, status, email, total_cents, metadata, shipping_provider, shipping_service_name, shipping_price_cents, shipping_rate_ext_id, shipping_eta_min_days, shipping_eta_max_days, shipping_tracking_number, shipping_label_url, shipping_status")
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
      shipping_provider: orderData.shipping_provider || null,
      shipping_service_name: orderData.shipping_service_name || null,
      shipping_price_cents: orderData.shipping_price_cents || null,
      shipping_rate_ext_id: orderData.shipping_rate_ext_id || null,
      shipping_eta_min_days: orderData.shipping_eta_min_days || null,
      shipping_eta_max_days: orderData.shipping_eta_max_days || null,
      shipping_tracking_number: orderData.shipping_tracking_number || null,
      shipping_label_url: orderData.shipping_label_url || null,
      shipping_status: orderData.shipping_status || null,
    };
  } catch (err) {
    console.error("[getOrderWithItems] Error inesperado:", err);
    return null;
  }
}

/**
 * Tipos para filtros de admin
 */
export type AdminOrderFilters = {
  status?: string | null;
  email?: string | null;
  dateFrom?: string | null; // ISO date string
  dateTo?: string | null; // ISO date string
  limit?: number;
  offset?: number;
};

/**
 * Obtiene todas las órdenes para el panel de administración
 * @param filters - Filtros opcionales (status, email, rango de fechas, paginación)
 * @returns Lista de órdenes resumidas con paginación
 */
export async function getAllOrdersAdmin(
  filters: AdminOrderFilters = {},
): Promise<{ orders: OrderSummary[]; total: number }> {
  const supabase = createServiceRoleSupabase();
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  try {
    let query = supabase
      .from("orders")
      .select("id, created_at, status, email, total_cents, metadata, shipping_provider, shipping_service_name, shipping_price_cents, shipping_rate_ext_id, shipping_eta_min_days, shipping_eta_max_days, shipping_tracking_number, shipping_label_url, shipping_status", {
        count: "exact",
      });

    // Aplicar filtros
    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.email) {
      const normalizedEmail = normalizeEmail(filters.email);
      if (normalizedEmail) {
        query = query.ilike("email", `%${normalizedEmail}%`);
      }
    }

    if (filters.dateFrom) {
      query = query.gte("created_at", filters.dateFrom);
    }

    if (filters.dateTo) {
      // Añadir 1 día para incluir todo el día "hasta"
      const dateTo = new Date(filters.dateTo);
      dateTo.setDate(dateTo.getDate() + 1);
      query = query.lt("created_at", dateTo.toISOString());
    }

    // Ordenar por fecha más reciente primero
    query = query.order("created_at", { ascending: false });

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[getAllOrdersAdmin] Tabla orders no disponible.");
        }
        return { orders: [], total: 0 };
      }
      console.error("[getAllOrdersAdmin] Error de Supabase:", {
        code: error.code,
        message: error.message,
      });
      return { orders: [], total: 0 };
    }

    const orders = (data || []).map((order) => ({
      id: order.id,
      shortId: `${order.id.slice(0, 8)}…`,
      created_at: order.created_at,
      status: order.status,
      email: order.email || "",
      total_cents: order.total_cents,
      metadata: (order.metadata as OrderSummary["metadata"]) || null,
      shipping_provider: order.shipping_provider || null,
      shipping_service_name: order.shipping_service_name || null,
      shipping_price_cents: order.shipping_price_cents || null,
      shipping_rate_ext_id: order.shipping_rate_ext_id || null,
      shipping_eta_min_days: order.shipping_eta_min_days || null,
      shipping_eta_max_days: order.shipping_eta_max_days || null,
      shipping_tracking_number: order.shipping_tracking_number || null,
      shipping_label_url: order.shipping_label_url || null,
      shipping_status: order.shipping_status || null,
    }));

    return {
      orders,
      total: count ?? 0,
    };
  } catch (err) {
    console.error("[getAllOrdersAdmin] Error inesperado:", err);
    return { orders: [], total: 0 };
  }
}

/**
 * Obtiene una orden específica con sus items para el panel de administración
 * (sin restricciones de email)
 * @param orderId - ID de la orden (UUID)
 * @returns Orden completa con items, o null si no existe
 */
export async function getOrderWithItemsAdmin(
  orderId: string,
): Promise<OrderDetail | null> {
  const supabase = createServiceRoleSupabase();

  if (!orderId || orderId.trim().length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[getOrderWithItemsAdmin] orderId vacío, devolviendo null");
    }
    return null;
  }

  const normalizedOrderId = orderId.trim();

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("[getOrderWithItemsAdmin] Iniciando búsqueda:", {
        orderId: normalizedOrderId,
      });
    }

    // Buscar orden por id
    const { data: orderData, error } = await supabase
      .from("orders")
      .select("id, created_at, status, email, total_cents, metadata, shipping_provider, shipping_service_name, shipping_price_cents, shipping_rate_ext_id, shipping_eta_min_days, shipping_eta_max_days, shipping_tracking_number, shipping_label_url, shipping_status")
      .eq("id", normalizedOrderId)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[getOrderWithItemsAdmin] Tabla orders no disponible.");
        }
        return null;
      }
      console.error("[getOrderWithItemsAdmin] Error al buscar orden:", {
        orderId: normalizedOrderId,
        code: error.code,
        message: error.message,
      });
      return null;
    }

    if (!orderData) {
      if (process.env.NODE_ENV !== "production") {
        console.log("[getOrderWithItemsAdmin] Orden no encontrada:", {
          orderId: normalizedOrderId,
        });
      }
      return null;
    }

    // Cargar items
    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("id, product_id, title, qty, unit_price_cents, image_url")
      .eq("order_id", orderData.id);

    if (itemsError) {
      console.error("[getOrderWithItemsAdmin] Error al leer order_items:", {
        orderId: orderData.id,
        error: itemsError.message,
        code: itemsError.code,
      });
    }

    const items = itemsData || [];

    // Extraer información de envío de metadata
    const metadata = (orderData.metadata as OrderSummary["metadata"]) || null;
    
    // Construir shipping desde metadata primero
    const shipping: ShippingInfo = {
      contact_name: metadata?.contact_name || null,
      contact_phone: metadata?.contact_phone || null,
      contact_address: metadata?.contact_address || null,
      contact_city: metadata?.contact_city || null,
      contact_state: metadata?.contact_state || null,
      contact_cp: metadata?.contact_cp || null,
      shipping_method: metadata?.shipping_method || null,
    };

    // Si faltan campos críticos (address o phone), intentar fallback desde account_addresses
    const needsFallback = (!shipping.contact_address || !shipping.contact_phone) && orderData.email;
    
    if (needsFallback) {
      try {
        const { getAddressesByEmail } = await import("@/lib/supabase/addresses.server");
        const addresses = await getAddressesByEmail(orderData.email);
        
        if (addresses.length > 0) {
          // Usar dirección default o la más reciente
          const defaultAddress = addresses.find((a) => a.is_default) || addresses[0];
          
          // Rellenar solo los campos que faltan
          if (!shipping.contact_name && defaultAddress.full_name) {
            shipping.contact_name = defaultAddress.full_name;
          }
          if (!shipping.contact_phone && defaultAddress.phone) {
            shipping.contact_phone = defaultAddress.phone;
          }
          if (!shipping.contact_address && defaultAddress.street) {
            shipping.contact_address = defaultAddress.street;
            // Si hay neighborhood, añadirlo a la dirección
            if (defaultAddress.neighborhood) {
              shipping.contact_address = `${defaultAddress.street}, ${defaultAddress.neighborhood}`;
            }
          }
          if (!shipping.contact_city && defaultAddress.city) {
            shipping.contact_city = defaultAddress.city;
          }
          if (!shipping.contact_state && defaultAddress.state) {
            shipping.contact_state = defaultAddress.state;
          }
          if (!shipping.contact_cp && defaultAddress.zip_code) {
            shipping.contact_cp = defaultAddress.zip_code;
          }
        }
      } catch (addressError) {
        // Si falla el fallback, continuar con lo que tenemos de metadata
        if (process.env.NODE_ENV === "development") {
          console.warn("[getOrderWithItemsAdmin] Error al obtener direcciones de fallback:", addressError);
        }
      }
    }

    return {
      id: orderData.id,
      shortId: `${orderData.id.slice(0, 8)}…`,
      created_at: orderData.created_at,
      status: orderData.status,
      email: orderData.email || "",
      total_cents: orderData.total_cents,
      metadata,
      items,
      ownedByEmail: null, // No aplica en admin
      shipping,
      shipping_provider: orderData.shipping_provider || null,
      shipping_service_name: orderData.shipping_service_name || null,
      shipping_price_cents: orderData.shipping_price_cents || null,
      shipping_rate_ext_id: orderData.shipping_rate_ext_id || null,
      shipping_eta_min_days: orderData.shipping_eta_min_days || null,
      shipping_eta_max_days: orderData.shipping_eta_max_days || null,
      shipping_tracking_number: orderData.shipping_tracking_number || null,
      shipping_label_url: orderData.shipping_label_url || null,
      shipping_status: orderData.shipping_status || null,
    };
  } catch (err) {
    console.error("[getOrderWithItemsAdmin] Error inesperado:", err);
    return null;
  }
}

