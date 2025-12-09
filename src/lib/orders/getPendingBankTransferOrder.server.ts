import "server-only";
import { createClient } from "@supabase/supabase-js";

export type PendingOrder = {
  id: string;
  total_cents: number;
  payment_method: "card" | "bank_transfer" | null;
  payment_status: "pending" | "paid" | "canceled" | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
};

export async function getPendingBankTransferOrder(orderId: string): Promise<{
  order: PendingOrder | null;
  error: "load-error" | "not-found" | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration for server-side order loading");
    return { order: null, error: "load-error" };
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase
      .from("orders")
      .select("id, total_cents, payment_method, payment_status, email, metadata, user_id")
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

