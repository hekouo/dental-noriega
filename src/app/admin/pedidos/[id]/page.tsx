import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { checkAdminAccess } from "@/lib/admin/access";
import { getOrderWithItemsAdmin } from "@/lib/supabase/orders.server";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { createSkydropxLabelAction } from "@/lib/actions/shipping.admin";
import { getShippingStatusLabel, getShippingStatusVariant } from "@/lib/orders/shippingStatus";
import { getPaymentMethodLabel, getPaymentStatusLabel, getPaymentStatusVariant } from "@/lib/orders/paymentStatus";
import { variantDetailFromJSON } from "@/lib/products/parseVariantDetail";
import UpdateShippingStatusClient from "./UpdateShippingStatusClient";
import UpdatePaymentStatusClient from "./UpdatePaymentStatusClient";
import ShippingSummaryClient from "./ShippingSummaryClient";
import ResendPaymentInstructionsClient from "./ResendPaymentInstructionsClient";
import WhatsappContactClient from "./WhatsappContactClient";
import AdminNotesClient from "./AdminNotesClient";
import EditShippingAndNotesClient from "./EditShippingAndNotesClient";
import NotifyShippingClient from "./NotifyShippingClient";
import { normalizePhoneToE164Mx } from "@/lib/utils/phone";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    success?: string;
    error?: string;
  }>;
};

/**
 * Página de detalle de una orden para administración
 * 
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 */
export default async function AdminPedidoDetailPage({
  params,
  searchParams,
}: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const { id } = await params;
  const sp = (await searchParams) ?? {};

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

  // Extraer teléfono de WhatsApp desde metadata (orden de prioridad)
  const rawMetadata = (order.metadata ?? null) as
    | {
        whatsapp?: string;
        phone?: string;
        contact_phone?: string;
        contact_name?: string;
        contactName?: string;
      }
    | null;
  const rawPhone =
    rawMetadata?.whatsapp ?? rawMetadata?.phone ?? rawMetadata?.contact_phone ?? null;
  const whatsappE164 = normalizePhoneToE164Mx(rawPhone);
  const contactName = rawMetadata?.contact_name ?? rawMetadata?.contactName ?? null;
  const orderShortId = order.id.slice(0, 8);

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

      {/* Mensajes de feedback */}
      {sp.success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {sp.success === "skydropx_label_created" &&
            "Guía Skydropx creada correctamente."}
          {sp.success !== "skydropx_label_created" &&
            "Operación realizada correctamente."}
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {sp.error === "skydropx_label_failed" &&
            "No se pudo crear la guía Skydropx. Revisa los datos de dirección y los logs."}
          {sp.error === "orden_no_encontrada" && "Orden no encontrada."}
          {sp.error === "direccion_incompleta" &&
            "La dirección de envío está incompleta. Completa CP, estado y ciudad."}
          {sp.error === "rate_id_no_encontrado" &&
            "No se encontró información de tarifa. Esta orden no tiene datos de envío calculados."}
          {sp.error === "configuracion_supabase" &&
            "Error de configuración. Contacta al administrador."}
          {sp.error === "error_actualizar_orden" &&
            "Error al actualizar la orden. Revisa los logs."}
          {!["skydropx_label_failed", "orden_no_encontrada", "direccion_incompleta", "rate_id_no_encontrado", "configuracion_supabase", "error_actualizar_orden"].includes(
            sp.error,
          ) && `Error: ${sp.error}`}
        </div>
      )}

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
              {(order.shipping?.contact_name || order.metadata?.contact_name) && (
                <div>
                  <p className="text-gray-600">Nombre</p>
                  <p className="font-medium">
                    {order.shipping?.contact_name || order.metadata?.contact_name}
                  </p>
                </div>
              )}
              {(order.metadata?.contact_email || order.email) && (
                <div>
                  <p className="text-gray-600">Email de contacto</p>
                  <p className="font-medium">
                    {order.metadata?.contact_email || order.email}
                  </p>
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

        {/* Datos de envío */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Envío</h2>
          {/* Resumen de estado de envío */}
          <ShippingSummaryClient
            shippingProvider={order.shipping_provider}
            shippingServiceName={order.shipping_service_name}
            shippingStatus={order.shipping_status}
            shippingTrackingNumber={order.shipping_tracking_number}
          />
          {order.shipping_provider ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Proveedor</p>
                  <p className="font-medium">
                    {order.shipping_provider === "pickup"
                      ? "Recoger en tienda"
                      : order.shipping_provider === "skydropx"
                        ? "Skydropx"
                        : order.shipping_provider}
                  </p>
                </div>
                {order.shipping_service_name && (
                  <div>
                    <p className="text-gray-600">Servicio</p>
                    <p className="font-medium">{order.shipping_service_name}</p>
                  </div>
                )}
                {order.shipping_price_cents !== null && (
                  <div>
                    <p className="text-gray-600">Precio</p>
                    <p className="font-medium">
                      {formatMXNFromCents(order.shipping_price_cents)}
                    </p>
                  </div>
                )}
                {(order.shipping_eta_min_days || order.shipping_eta_max_days) && (
                  <div>
                    <p className="text-gray-600">Tiempo estimado</p>
                    <p className="font-medium">
                      {order.shipping_eta_min_days && order.shipping_eta_max_days
                        ? `${order.shipping_eta_min_days}-${order.shipping_eta_max_days} días`
                        : order.shipping_eta_min_days
                          ? `${order.shipping_eta_min_days}+ días`
                          : ""}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-gray-600">Estado del envío</p>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      (() => {
                        const variant = getShippingStatusVariant(order.shipping_status);
                        switch (variant) {
                          case "success":
                            return "bg-green-100 text-green-700";
                          case "warning":
                            return "bg-yellow-100 text-yellow-700";
                          case "info":
                            return "bg-blue-100 text-blue-700";
                          case "destructive":
                            return "bg-red-100 text-red-700";
                          default:
                            return "bg-gray-100 text-gray-700";
                        }
                      })()
                    }`}
                  >
                    {getShippingStatusLabel(order.shipping_status)}
                  </span>
                </div>
                {order.shipping_tracking_number && (
                  <div>
                    <p className="text-gray-600">Número de guía</p>
                    <p className="font-medium font-mono">
                      {order.shipping_tracking_number}
                    </p>
                  </div>
                )}
                {order.shipping_label_url && (
                  <div>
                    <p className="text-gray-600">Etiqueta PDF</p>
                    <Link
                      href={order.shipping_label_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      Ver etiqueta PDF
                    </Link>
                  </div>
                )}
              </div>

              {/* Botón para crear guía si es Skydropx y no tiene tracking */}
              {order.shipping_provider === "skydropx" &&
                order.shipping_rate_ext_id &&
                !order.shipping_tracking_number && (
                  <form action={createSkydropxLabelAction.bind(null, order.id)}>
                    <button
                      type="submit"
                      className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                    >
                      Crear guía en Skydropx
                    </button>
                  </form>
                )}

              {/* Botón para notificar tracking al cliente */}
              <NotifyShippingClient
                orderRef={order.id.slice(0, 8)}
                trackingNumber={order.shipping_tracking_number}
                labelUrl={order.shipping_label_url}
                shippingStatus={order.shipping_status}
                shippingProvider={order.shipping_provider}
                customerName={(order.metadata as { contact_name?: string } | null)?.contact_name || null}
                customerEmail={order.email}
              />

              {/* Controles para actualizar estado de envío */}
              <UpdateShippingStatusClient
                orderId={order.id}
                currentStatus={order.shipping_status}
                shippingProvider={order.shipping_provider}
              />

              {/* Editor de campos de envío y notas */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-md font-semibold mb-4">Editar envío y notas</h3>
                <EditShippingAndNotesClient
                  orderId={order.id}
                  initialAdminNotes={order.admin_notes}
                  initialShippingStatus={order.shipping_status}
                  initialShippingTrackingNumber={order.shipping_tracking_number}
                  initialShippingLabelUrl={order.shipping_label_url}
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium mb-1">
                  Recoger en tienda
                </p>
                <p className="text-xs text-blue-700">
                  Esta orden es para recoger en tienda. Puedes establecer el estado "Listo para recoger en tienda" cuando el pedido esté listo.
                </p>
              </div>
              {/* Editor de envío y notas (para pickup) */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-md font-semibold mb-4">Editar envío y notas</h3>
                <EditShippingAndNotesClient
                  orderId={order.id}
                  initialAdminNotes={order.admin_notes}
                  initialShippingStatus={order.shipping_status}
                  initialShippingTrackingNumber={order.shipping_tracking_number}
                  initialShippingLabelUrl={order.shipping_label_url}
                />
              </div>
            </div>
          )}
        </div>

        {/* Estado de pago */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Método de pago</p>
              <p className="font-medium">
                {getPaymentMethodLabel(order.payment_method)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Estado de pago</p>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                  (() => {
                    const variant = getPaymentStatusVariant(order.payment_status);
                    switch (variant) {
                      case "success":
                        return "bg-green-100 text-green-700";
                      case "warning":
                        return "bg-yellow-100 text-yellow-700";
                      case "destructive":
                        return "bg-red-100 text-red-700";
                      default:
                        return "bg-gray-100 text-gray-700";
                    }
                  })()
                }`}
              >
                {getPaymentStatusLabel(order.payment_status)}
              </span>
            </div>
            {(() => {
              // Prioridad: columna > metadata.payment_provider > inferir desde stripe_payment_intent_id
              const paymentProvider = order.payment_provider 
                ?? (order.metadata as { payment_provider?: string } | null)?.payment_provider
                ?? ((order.metadata as { stripe_payment_intent_id?: string } | null)?.stripe_payment_intent_id ? "stripe" : null);
              
              return paymentProvider ? (
                <div>
                  <p className="text-sm text-gray-600">Proveedor de pago</p>
                  <p className="font-medium">{paymentProvider}</p>
                </div>
              ) : null;
            })()}
            {(() => {
              // Prioridad: columna > metadata.payment_id > metadata.stripe_payment_intent_id > metadata.checkout_session_id
              const paymentId = order.payment_id
                ?? (order.metadata as { payment_id?: string } | null)?.payment_id
                ?? (order.metadata as { stripe_payment_intent_id?: string } | null)?.stripe_payment_intent_id
                ?? (order.metadata as { checkout_session_id?: string } | null)?.checkout_session_id
                ?? null;
              
              return paymentId ? (
                <div>
                  <p className="text-sm text-gray-600">ID de pago</p>
                  <p className="font-medium font-mono text-xs">{paymentId}</p>
                </div>
              ) : null;
            })()}
          </div>

          {/* Controles para actualizar estado de pago */}
          <UpdatePaymentStatusClient
            orderId={order.id}
            currentStatus={order.payment_status}
          />

          {/* Botón para reenviar instrucciones de pago por transferencia */}
          {order.payment_method === "bank_transfer" &&
            order.payment_status === "pending" &&
            (order.email ||
              (order.metadata as { contact_email?: string; contactEmail?: string } | null)
                ?.contact_email ||
              (order.metadata as { contact_email?: string; contactEmail?: string } | null)
                ?.contactEmail) && (
              <ResendPaymentInstructionsClient orderId={order.id} />
            )}

          {/* Contacto por WhatsApp */}
          <WhatsappContactClient
            shortId={orderShortId}
            totalCents={totalCents}
            paymentMethod={order.payment_method as "card" | "bank_transfer" | null}
            contactName={contactName}
            whatsappE164={whatsappE164}
          />

        </div>

        {/* Notas internas - Solo mostrar si no hay sección de envío (ya está integrado arriba) */}
        {!order.shipping_provider && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold mb-4">Notas internas</h2>
            {order.admin_notes && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {order.admin_notes}
                </p>
              </div>
            )}
            <AdminNotesClient orderId={order.id} initialNotes={order.admin_notes} />
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
                        {item.variant_detail && (() => {
                          try {
                            const variantText = variantDetailFromJSON(item.variant_detail as { color?: string; notes?: string; [key: string]: string | undefined } | null);
                            if (variantText) {
                              return (
                                <p className="text-xs text-gray-600 italic mt-1">
                                  {variantText}
                                </p>
                              );
                            }
                          } catch {
                            // Si falla el parseo, mostrar formato simple
                          }
                          return (
                            <p className="text-xs text-gray-500 mt-1">
                              {Object.entries(item.variant_detail as Record<string, unknown>)
                                .map(([key, value]) => `${key}: ${String(value)}`)
                                .join(" · ")}
                            </p>
                          );
                        })()}
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
