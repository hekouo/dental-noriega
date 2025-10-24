import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { formatCurrency } from "@/lib/utils/currency";
import { ROUTES } from "@/lib/routes";
import { CheckCircle } from "lucide-react";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  created_at: string;
};

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
};

type Props = {
  searchParams: { orden?: string };
};

async function fetchOrder(orderId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return null;
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  return {
    order,
    items: items || []
  };
}

export default async function GraciasPage({ searchParams }: Props) {
  const orderId = searchParams.orden;

  if (!orderId) {
    return notFound();
  }

  const orderData = await fetchOrder(orderId);

  if (!orderData) {
    return notFound();
  }

  const { order, items } = orderData;

  return (
    <section className="mx-auto max-w-2xl p-6 text-center bg-white rounded-lg shadow-lg mt-10">
      <CheckCircle size={64} className="text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-4 text-gray-800">
        ¡Gracias por tu compra!
      </h1>
      <p className="text-gray-600 mb-6">
        Tu orden ha sido procesada exitosamente.
      </p>

      <div className="space-y-2 mb-6 text-left border-t border-b py-4">
        <p>
          <span className="font-semibold">Número de Orden:</span>{" "}
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            {order.id}
          </span>
        </p>
        <p>
          <span className="font-semibold">Cliente:</span> {order.customer_name}
        </p>
        <p>
          <span className="font-semibold">Email:</span> {order.customer_email}
        </p>
        
        {/* Items de la orden */}
        {items.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Productos:</h3>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id} className="text-sm">
                  {item.name} x {item.qty} - {formatCurrency(item.subtotal)}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-2xl font-bold text-primary-600">
          <span className="font-semibold">Total:</span>{" "}
          {formatCurrency(order.total)}
        </p>
        <p className="text-sm text-gray-500">
          Fecha: {new Date(order.created_at).toLocaleDateString()}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
        <Link href={ROUTES.destacados()} className="btn btn-primary">
          <span>Seguir Comprando</span>
        </Link>
        <Link href={ROUTES.home()} className="btn btn-secondary">
          <span>Ir al Inicio</span>
        </Link>
      </div>
    </section>
  );
}