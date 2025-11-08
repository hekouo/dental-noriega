"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { formatMXN } from "@/lib/utils/currency";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { AuthGuard } from "@/components/auth/AuthGuard";
import buttonStyles from "@/components/ui/button.module.css";

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  fulfilled: "Completado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  fulfilled: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

type OrderItemRecord = {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
};

type Order = {
  id: string;
  status: string;
  created_at: string;
  total_amount: number;
  order_items?: OrderItemRecord[];
};

export default function PedidosPageClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    const s = getBrowserSupabase();
    if (!s) {
      setIsLoading(false);
      return;
    }
    const {
      data: { user },
    } = await s.auth.getUser();

    if (user) {
      const { data } = await s
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setOrders(data || []);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Mis Pedidos</h1>

          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-500 mb-4">No tienes pedidos aún</p>
              <Link
                href={ROUTES.catalogIndex()}
                className={`${buttonStyles.primary} px-4`}
              >
                Ver Catálogo
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Orden #{order.id}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {format(new Date(order.created_at), "PPP", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 md:mt-0">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[order.status]}`}
                      >
                        {statusLabels[order.status]}
                      </span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatMXN(order.total_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Productos ({order.order_items?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item: OrderItemRecord) => (
                        <div
                          key={item.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-medium">
                            {formatMXN(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end mt-4">
                    <Link
                      href={`${ROUTES.cuenta()}/pedidos/${order.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Ver Detalles
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
