import "server-only";
import { getPublicSupabase } from "@/lib/supabase/public";

export type PendingOrder = {
  id: string;
  total_cents: number;
  payment_method: "card" | "bank_transfer" | null;
  payment_status: "pending" | "paid" | "canceled" | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
};

export async function getPendingBankTransferOrder(orderId: string): Promise<{
  order: PendingOrder | null;
  error: "load-error" | "not-found" | null;
}> {
  const supabase = getPublicSupabase();

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
}

