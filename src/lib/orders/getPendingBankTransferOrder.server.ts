import "server-only";
import { createClient } from "@supabase/supabase-js";

export type PendingOrder = {
  id: string;
  total_cents: number;
  payment_method: "card" | "bank_transfer" | null;
  payment_status: "pending" | "paid" | "canceled" | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Crea un cliente Supabase con SERVICE_ROLE_KEY (bypassa RLS)
 * Necesario para leer órdenes de guest que no tienen user_id
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

/**
 * Obtiene una orden pendiente de transferencia bancaria por su ID
 * Usa SERVICE_ROLE_KEY para bypassar RLS y poder leer órdenes de guest
 */
export async function getPendingBankTransferOrder(
  orderId: string
): Promise<{ order: PendingOrder | null; error: "load-error" | "not-found" | null }> {
  try {
    const supabase = createServiceRoleSupabase();

    const { data, error } = await supabase
      .from("orders")
      .select("id, total_cents, payment_method, payment_status, email, metadata")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Error loading pending bank transfer order", { orderId, error });
      return { order: null, error: "load-error" };
    }

    if (!data) {
      console.warn("Pending bank transfer order not found", { orderId });
      return { order: null, error: "not-found" };
    }

    return { order: data as PendingOrder, error: null };
  } catch (err) {
    console.error("Exception loading pending bank transfer order", { orderId, error: err });
    return { order: null, error: "load-error" };
  }
}

