import type { Metadata } from "next";
import PagoPendienteClient from "./PagoPendienteClient";
import { getPendingBankTransferOrder } from "@/lib/orders/getPendingBankTransferOrder.server";
import { clearCartForUser } from "@/lib/cart/clearCartForUser.server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pago Pendiente",
  description: "Instrucciones para completar tu pago",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function PagoPendientePage({ searchParams }: Props) {
  const params = await searchParams;
  const orderId = params.order;

  // Si no hay orderId, pasar null y error not-found
  if (!orderId || typeof orderId !== "string") {
    return <PagoPendienteClient order={null} error="not-found" />;
  }

  // Cargar la orden en el servidor
  const { order, error } = await getPendingBankTransferOrder(orderId);

  // Si hay una orden válida con user_id, limpiar el carrito en Supabase
  if (order && order.user_id) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Limpiar carrito en Supabase (no crítico si falla)
      const clearResult = await clearCartForUser(supabase, order.user_id);
      if (!clearResult.success && process.env.NODE_ENV === "development") {
        console.warn("[PagoPendientePage] No se pudo limpiar carrito:", clearResult.error);
      }
    }
  }

  return <PagoPendienteClient order={order} error={error} />;
}

