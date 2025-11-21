"use client";

import { useState, useRef, useEffect } from "react";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { isValidEmail } from "@/lib/validation/email";
import {
  LOYALTY_MIN_POINTS_FOR_DISCOUNT,
  LOYALTY_DISCOUNT_PERCENT,
} from "@/lib/loyalty/config";
import type {
  OrderSummary,
  OrderDetail,
} from "@/lib/supabase/orders.server";

export default function PedidosPage() {
  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const [loyaltyPoints, setLoyaltyPoints] = useState<{
    pointsBalance: number;
    lifetimeEarned: number;
    canApplyDiscount: boolean;
  } | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOrders(null);
    setOrderDetail(null);

    const searchEmail = email.trim();
    if (!searchEmail || !isValidEmail(searchEmail)) {
      setError("Email inválido");
      setLoading(false);
      return;
    }

    try {
      // Hacer ambas llamadas en paralelo: órdenes y puntos de lealtad
      const [ordersResponse, loyaltyResponse] = await Promise.all([
        fetch("/api/account/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: searchEmail,
            orderId: orderId.trim() || undefined,
          }),
        }),
        fetch(`/api/account/loyalty?email=${encodeURIComponent(searchEmail)}`),
      ]);

      const ordersData = await ordersResponse.json();
      const loyaltyData = await loyaltyResponse.json();

      if (!ordersResponse.ok) {
        setError(ordersData.error || "Error al obtener pedidos");
        return;
      }

      if (ordersData.order) {
        // Detalle de una orden
        setOrderDetail(ordersData.order);
        setOrders(null);
      } else if (ordersData.orders) {
        // Lista de órdenes
        setOrders(ordersData.orders);
        setOrderDetail(null);
      }

      // Actualizar puntos de lealtad si la respuesta fue exitosa
      if (loyaltyResponse.ok && loyaltyData) {
        setLoyaltyPoints({
          pointsBalance: loyaltyData.pointsBalance || 0,
          lifetimeEarned: loyaltyData.lifetimeEarned || 0,
          canApplyDiscount: loyaltyData.canApplyDiscount || false,
        });
        setLoyaltyError(null);
      } else {
        // Si falla, mostrar mensaje suave pero no romper la página
        setLoyaltyError("No se pudieron cargar los puntos de lealtad.");
        if (process.env.NODE_ENV === "development") {
          console.error("[PedidosPage] Error al cargar puntos:", loyaltyData.error);
        }
      }
    } catch (err) {
      // Diferenciar errores de red de otros errores
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Hubo un problema al cargar tus pedidos. Intenta de nuevo en unos segundos.");
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    if (!email.trim()) return;

    setLoadingDetail(true);
    setError(null);
    setSelectedOrderId(id);
    setOrderDetail(null); // Limpiar detalle anterior

    const requestBody = {
      email: email.trim(),
      orderId: id,
    };

    // Log temporal para debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[handleViewDetail] Request:", requestBody);
    }

    try {
      const response = await fetch("/api/account/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = (errorData as { error?: string }).error || "Error al cargar el detalle del pedido";
        setError(errorMsg);
        setLoadingDetail(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = (errorData as { error?: string }).error || "Error al cargar el detalle del pedido";
        setError(errorMsg);
        setSelectedOrderId(null);
        setOrderDetail(null);
        setLoadingDetail(false);
        return;
      }

      const data = await response.json();

      // Log temporal para debugging
      if (process.env.NODE_ENV === "development") {
        console.log("[handleViewDetail] Response:", {
          status: response.status,
          ok: response.ok,
          data,
        });
      }

      if (data.order) {
        setOrderDetail(data.order);
        // Log temporal para debugging
        if (process.env.NODE_ENV === "development") {
          console.log("[handleViewDetail] Order detail set:", {
            id: data.order.id,
            itemsCount: data.order.items?.length || 0,
          });
        }
      } else {
        setError("No se recibió información del pedido");
        setSelectedOrderId(null);
        setOrderDetail(null);
      }
    } catch (err) {
      // Diferenciar errores de red de otros errores
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Hubo un problema al cargar el detalle del pedido. Intenta de nuevo en unos segundos.");
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
      setSelectedOrderId(null);
      setOrderDetail(null);
      console.error("[handleViewDetail] Error:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

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

  const formatShippingMethod = (method?: string) => {
    const methodMap: Record<string, string> = {
      pickup: "Recoger en tienda",
      standard: "Envío estándar",
      express: "Envío express",
      delivery: "Entrega",
    };
    return methodMap[method || ""] || method || "No especificado";
  };

  // Scroll suave al panel de detalle cuando se carga
  useEffect(() => {
    if (!orderDetail || !detailRef.current) return;
    
    // Pequeño delay para asegurar que el DOM se actualizó
    const timeoutId = setTimeout(() => {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [orderDetail]);

  // Los puntos de lealtad ahora se cargan en handleSubmit junto con las órdenes
  // para asegurar que siempre estén actualizados cuando el usuario busca pedidos

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6 sm:mb-8 text-gray-900">Mis Pedidos</h1>

        {/* Formulario de búsqueda */}
        <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-lg shadow mb-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Ingresa el correo con el que realizaste tu compra para ver el historial de pedidos.
              </p>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label
                htmlFor="orderId"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                ID de pedido (opcional)
              </label>
              <input
                id="orderId"
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="UUID del pedido"
                autoComplete="off"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Deja vacío para ver todos tus pedidos
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {loading ? "Buscando..." : "Buscar pedidos"}
            </button>
          </div>
        </form>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6" role="alert">
            <p className="font-medium mb-2">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                handleSubmit(new Event("submit") as unknown as React.FormEvent);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Panel de puntos de lealtad */}
        {email.trim() && isValidEmail(email) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-8">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-4 text-gray-900">Tus puntos</h2>
            {loading ? (
              <p className="text-gray-600">Cargando puntos...</p>
            ) : loyaltyPoints !== null ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Puntos actuales:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {loyaltyPoints.pointsBalance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Has acumulado:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {loyaltyPoints.lifetimeEarned.toLocaleString()} puntos en total
                  </span>
                </div>
                <div className="pt-3 border-t border-blue-200">
                  <p className="text-sm text-gray-600">
                    Cada $1 MXN que pagas en tus pedidos genera puntos de lealtad. Al llegar al mínimo, puedes usarlos como descuento en tu siguiente compra.
                  </p>
                  {loyaltyPoints.canApplyDiscount && (
                    <p className="text-sm font-medium text-green-700 mt-2">
                      ¡Tienes suficientes puntos para usar el descuento en tu próxima compra!
                    </p>
                  )}
                </div>
              </div>
            ) : loyaltyError ? (
              <p className="text-yellow-700 text-sm">{loyaltyError}</p>
            ) : (
              <p className="text-gray-600">No se pudieron cargar los puntos.</p>
            )}
          </div>
        )}

        {/* Lista de órdenes */}
        {orders && orders.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900">
                {orders.length} pedido{orders.length !== 1 ? "s" : ""} encontrado
                {orders.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {orders.map((order) => {
                const isSelected = selectedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    className={`px-4 sm:px-6 py-4 transition-colors ${
                      isSelected
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-500">
                          {order.id.substring(0, 8)}...
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            order.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : order.status === "pending"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {formatStatus(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(order.created_at)}
                      </p>
                      {order.metadata?.shipping_method && (
                        <p className="text-sm text-gray-600 mt-1">
                          {(() => {
                            const method = formatShippingMethod(order.metadata.shipping_method);
                            const shippingCostCents = order.metadata.shipping_cost_cents;
                            
                            // Log temporal para debugging
                            if (process.env.NODE_ENV === "development") {
                              console.log("[PedidosPage] Shipping info:", {
                                orderId: order.id,
                                method: order.metadata.shipping_method,
                                shippingCostCents,
                                metadata: order.metadata,
                              });
                            }
                            
                            if (shippingCostCents !== undefined && shippingCostCents !== null) {
                              if (shippingCostCents > 0) {
                                return `${method} · ${formatMXNFromCents(shippingCostCents)}`;
                              } else {
                                // Envío gratis (subtotal >= $2,000 MXN)
                                return `${method} · $0.00 (envío gratis)`;
                              }
                            }
                            
                            // Si no hay información de costo, solo mostrar el método
                            return method;
                          })()}
                        </p>
                      )}
                      {/* Resumen de puntos en la lista (solo si está paid y tiene info) */}
                      {order.status === "paid" && (() => {
                        const earned = order.metadata?.loyalty_points_earned;
                        const spent = order.metadata?.loyalty_points_spent;
                        const hasEarned = earned !== null && earned !== undefined && earned > 0;
                        const hasSpent = spent !== null && spent !== undefined && spent > 0;
                        
                        if (!hasEarned && !hasSpent) return null;
                        
                        return (
                          <p className="text-xs text-gray-500 mt-1">
                            {hasEarned && hasSpent && earned && spent
                              ? `Puntos: +${earned.toLocaleString()} / -${spent.toLocaleString()}`
                              : hasEarned && earned
                                ? `Puntos: +${earned.toLocaleString()}`
                                : hasSpent && spent
                                  ? `Puntos: -${spent.toLocaleString()}`
                                  : null}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="text-right ml-4">
                      {order.total_cents !== null && (
                        <p className="text-lg font-bold">
                          {formatMXNFromCents(order.total_cents)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleViewDetail(order.id)}
                        disabled={loadingDetail && selectedOrderId === order.id}
                        className="mt-2 text-sm text-primary-600 hover:text-primary-700 underline disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`Ver detalle del pedido ${order.id.substring(0, 8)}`}
                      >
                        {loadingDetail && selectedOrderId === order.id
                          ? "Cargando detalle..."
                          : "Ver detalle"}
                      </button>
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {orders && orders.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600 mb-2">
              No encontramos pedidos con este correo.
            </p>
            <p className="text-sm text-gray-500">
              Verifica que tu email esté bien escrito o prueba con otro que hayas usado antes para comprar.
            </p>
          </div>
        )}

        {/* Detalle de orden */}
        {orderDetail && (
          <div ref={detailRef} className="bg-white rounded-lg shadow overflow-hidden mt-8">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900">Detalle del Pedido</h2>
            </div>

            <div className="px-4 sm:px-6 py-4 space-y-4">
              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">ID del pedido</p>
                  <p className="font-mono text-sm">{orderDetail.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p>{formatDate(orderDetail.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      orderDetail.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : orderDetail.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {formatStatus(orderDetail.status)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p>{orderDetail.email}</p>
                </div>
              </div>

              {/* Items */}
              {orderDetail.items.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Productos</h3>
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
                        {orderDetail.items.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="font-medium">{item.title}</p>
                              {item.product_id && (
                                <p className="text-sm text-gray-500">
                                  ID: {item.product_id.substring(0, 8)}...
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.qty}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatMXNFromCents(item.unit_price_cents)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatMXNFromCents(
                                item.unit_price_cents * item.qty,
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totales */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-full md:w-64 space-y-2">
                    {orderDetail.metadata?.subtotal_cents && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span>
                          {formatMXNFromCents(
                            orderDetail.metadata.subtotal_cents,
                          )}
                        </span>
                      </div>
                    )}
                    {orderDetail.metadata?.discount_cents &&
                      orderDetail.metadata.discount_cents > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>
                            Descuento
                            {orderDetail.metadata.coupon_code &&
                              ` (${orderDetail.metadata.coupon_code})`}
                            :
                          </span>
                          <span>
                            -{formatMXNFromCents(
                              orderDetail.metadata.discount_cents,
                            )}
                          </span>
                        </div>
                      )}
                    {orderDetail.total_cents !== null && (
                      <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span>
                          {formatMXNFromCents(orderDetail.total_cents)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Puntos de lealtad por pedido */}
              {orderDetail.status === "paid" && (() => {
                const earned = orderDetail.metadata?.loyalty_points_earned;
                const spent = orderDetail.metadata?.loyalty_points_spent;
                const hasEarned = earned !== null && earned !== undefined && earned > 0;
                const hasSpent = spent !== null && spent !== undefined && spent > 0;
                
                if (!hasEarned && !hasSpent) return null;
                
                const netPoints = (earned || 0) - (spent || 0);
                
                return (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Puntos de lealtad
                    </h3>
                    <div className="flex justify-end">
                      <div className="w-full md:w-64 space-y-2">
                        {hasEarned && earned && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Puntos ganados:</span>
                            <span className="text-green-600 font-medium">
                              +{earned.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {hasSpent && spent && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Puntos usados:</span>
                            <span className="text-orange-600 font-medium">
                              -{spent.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {(hasEarned || hasSpent) && (
                          <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-200">
                            <span className="text-gray-700">Puntos netos:</span>
                            <span className="text-gray-900">
                              {netPoints.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
