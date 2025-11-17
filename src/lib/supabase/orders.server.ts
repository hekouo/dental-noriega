import "server-only";
import { createActionSupabase } from "./server-actions";

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
    coupon_code?: string;
    subtotal_cents?: number;
    discount_cents?: number;
    contact_name?: string;
    contact_email?: string;
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
 * Obtiene las órdenes de un email específico
 * @param email - Email del usuario
 * @param options - Opciones de consulta (limit por defecto 10)
 * @returns Lista de órdenes resumidas (sin items)
 */
export async function getOrdersByEmail(
  email: string,
  options?: { limit?: number },
): Promise<OrderSummary[]> {
  const supabase = createActionSupabase();
  const limit = options?.limit ?? 10;

  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, status, email, total_cents, metadata")
    .eq("email", email.toLowerCase().trim())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getOrdersByEmail] Error:", error);
    throw new Error(`Error al obtener órdenes: ${error.message}`);
  }

  return (data || []).map((order) => ({
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    email: order.email,
    total_cents: order.total_cents,
    metadata: (order.metadata as OrderSummary["metadata"]) || null,
  }));
}

/**
 * Obtiene una orden específica con sus items, verificando que pertenezca al email
 * @param orderId - ID de la orden
 * @param email - Email del usuario (para verificación de seguridad)
 * @returns Orden completa con items, o null si no existe o no pertenece al email
 */
export async function getOrderWithItems(
  orderId: string,
  email: string,
): Promise<OrderDetail | null> {
  const supabase = createActionSupabase();

  // Primero verificar que la orden existe y pertenece al email
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, created_at, status, email, total_cents, metadata")
    .eq("id", orderId)
    .eq("email", email.toLowerCase().trim())
    .single();

  if (orderError || !orderData) {
    console.warn(
      `[getOrderWithItems] Orden ${orderId} no encontrada o no pertenece a ${email}`,
    );
    return null;
  }

  // Obtener los items de la orden
  const { data: itemsData, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, title, qty, unit_price_cents, image_url")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("[getOrderWithItems] Error al obtener items:", itemsError);
    // Aún así devolver la orden sin items si hay error
    return {
      id: orderData.id,
      created_at: orderData.created_at,
      status: orderData.status,
      email: orderData.email,
      total_cents: orderData.total_cents,
      metadata: (orderData.metadata as OrderSummary["metadata"]) || null,
      items: [],
    };
  }

  return {
    id: orderData.id,
    created_at: orderData.created_at,
    status: orderData.status,
    email: orderData.email,
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

