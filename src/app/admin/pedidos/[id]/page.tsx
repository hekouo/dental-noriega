import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { formatMXNFromCents } from "@/lib/utils/currency";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

/**
 * Página de detalle de una orden para administración
 * 
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 */
export default async function AdminPedidoDetailPage({ params }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const { id } = await params;

  // Obtener orden con items
  const order = await getOrderWithItemsAdmin(id);

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 mb-2">
            Orden no encontrada
          </h1>
          <p className="text-red-600 mb-4">
            No se encontró una orden con el ID proporcionado.
          </p>
          <Link
            href="/admin/pedidos"
            className="text-primary-600 hover:text-primary-700 underline"
          >
            ← Volver a la lista de pedidos
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pendiente",
      paid: "Pagado",
      failed: "Fallido",
      canceled: "Cancelado",
      requires_payment: "Requiere pago",
      requires_action: "Requiere acción",
    };
    return statusMap[status] || status;
  };

  // Calcular totales desde items si no están en metadata
  const subtotalFromItems = order.items.reduce(
    (sum, item) => sum + item.unit_price_cents * item.qty,
    0,
  );
  const subtotalCents =
    order.metadata?.subtotal_cents ?? subtotalFromItems;
  const discountCents = order.metadata?.discount_cents ?? 0;
  const shippingCents = order.metadata?.shipping_cost_cents ?? 0;
  const totalCents = order.total_cents ?? subtotalCents - discountCents + shippingCents;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <Link
          href="/admin/pedidos"
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Volver a la lista de pedidos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Detalle del Pedido</h1>
        <p className="text-sm text-gray-500 mt-1">
          ID: <span className="font-mono">{order.id}</span>
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Información básica */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Fecha</p>
              <p className="font-medium">{formatDate(order.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado</p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                  order.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : order.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : order.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                }`}
              >
                {formatStatus(order.status)}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="font-medium">{order.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="font-bold text-lg">
                {formatMXNFromCents(totalCents)}
              </p>
            </div>
          </div>
        </div>

        {/* Datos de contacto y envío */}
        {(order.metadata || order.shipping) && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-3">Datos de Contacto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
              {order.metadata?.contact_name && (
                <div>
                  <p className="text-gray-600">Nombre</p>
                  <p className="font-medium">{order.metadata.contact_name}</p>
                </div>
              )}
              {order.metadata?.contact_email && (
                <div>
                  <p className="text-gray-600">Email de contacto</p>
                  <p className="font-medium">{order.metadata.contact_email}</p>
                </div>
              )}
              {order.shipping?.contact_phone && (
                <div>
                  <p className="text-gray-600">Teléfono</p>
                  <p className="font-medium">{order.shipping.contact_phone}</p>
                </div>
              )}
            </div>

            {/* Dirección de envío */}
            {order.shipping && (
              order.shipping.contact_address ||
              order.shipping.contact_city ||
              order.shipping.contact_state ||
              order.shipping.contact_cp
            ) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-md font-semibold mb-3">Dirección de Entrega</h3>
                <div className="space-y-2 text-sm">
                  {order.shipping.contact_address && (
                    <div>
                      <p className="text-gray-600">Dirección</p>
                      <p className="font-medium">{order.shipping.contact_address}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {order.shipping.contact_city && (
                      <div>
                        <p className="text-gray-600">Ciudad</p>
                        <p className="font-medium">{order.shipping.contact_city}</p>
                      </div>
                    )}
                    {order.shipping.contact_state && (
                      <div>
                        <p className="text-gray-600">Estado</p>
                        <p className="font-medium">{order.shipping.contact_state}</p>
                      </div>
                    )}
                    {order.shipping.contact_cp && (
                      <div>
                        <p className="text-gray-600">Código Postal</p>
                        <p className="font-medium">{order.shipping.contact_cp}</p>
                      </div>
                    )}
                  </div>
                  {order.shipping.shipping_method && (
                    <div className="mt-2">
                      <p className="text-gray-600">Método de envío</p>
                      <p className="font-medium">
                        {order.shipping.shipping_method === "pickup"
                          ? "Recoger en tienda"
                          : order.shipping.shipping_method === "standard"
                            ? "Estándar"
                            : order.shipping.shipping_method === "express"
                              ? "Express"
                              : order.shipping.shipping_method}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Productos */}
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold mb-4">Productos</h2>
          {order.items.length === 0 ? (
            <p className="text-gray-500">No hay productos en esta orden.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Precio unitario
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.title}</p>
                        {item.product_id && (
                          <p className="text-xs text-gray-500 font-mono">
                            ID: {item.product_id}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{item.qty}</td>
                      <td className="px-4 py-3 text-right">
                        {formatMXNFromCents(item.unit_price_cents)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMXNFromCents(item.unit_price_cents * item.qty)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Totales */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatMXNFromCents(subtotalCents)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>
                    Descuento
                    {order.metadata?.coupon_code &&
                      ` (${order.metadata.coupon_code})`}
                    :
                  </span>
                  <span>-{formatMXNFromCents(discountCents)}</span>
                </div>
              )}
              {shippingCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Envío:</span>
                  <span>{formatMXNFromCents(shippingCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                <span>Total:</span>
                <span>{formatMXNFromCents(totalCents)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Puntos de lealtad (si aplica) */}
        {order.status === "paid" &&
          (order.metadata?.loyalty_points_earned ||
            order.metadata?.loyalty_points_spent) && (
            <div className="px-6 py-4 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Puntos de Lealtad
              </h3>
              <div className="flex justify-end">
                <div className="w-full md:w-64 space-y-1 text-sm">
                  {order.metadata.loyalty_points_earned && (
                    <div className="flex justify-between">
                    <span className="text-gray-600">Puntos ganados:</span>
                    <span className="text-green-600 font-medium">
                      +{order.metadata.loyalty_points_earned.toLocaleString()}
                    </span>
                  </div>
                  )}
                  {order.metadata.loyalty_points_spent && (
                    <div className="flex justify-between">
                    <span className="text-gray-600">Puntos usados:</span>
                    <span className="text-orange-600 font-medium">
                      -{order.metadata.loyalty_points_spent.toLocaleString()}
                    </span>
                  </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

