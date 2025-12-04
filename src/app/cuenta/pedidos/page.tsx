"use client";

import { useState, useRef, useEffect } from "react";
import { formatMXNFromCents } from "@/lib/utils/currency";
import { isValidEmail } from "@/lib/validation/email";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type {
  OrderSummary,
  OrderDetail,
} from "@/lib/supabase/orders.server";
import AccountSectionHeader from "@/components/account/AccountSectionHeader";

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const ordersRef = useRef<HTMLDivElement | null>(null);

  // Cargar email del usuario autenticado al montar
  useEffect(() => {
    const loadUserEmail = async () => {
      const s = getBrowserSupabase();
      if (!s) return;

      try {
        const { data: { user } } = await s.auth.getUser();
        if (user?.email && isValidEmail(user.email)) {
          setUserEmail(user.email);
          // Pre-llenar el email solo si el campo está vacío
          setEmail((prev) => prev || user.email || "");
          setIsAuthenticated(true);
          const metadata = user.user_metadata || {};
          setUserFullName(
            metadata.full_name || metadata.fullName || null,
          );
          // Cargar órdenes automáticamente si el usuario está autenticado
          handleAutoLoad(user.email);
        }
      } catch (err) {
        // Ignorar errores de autenticación
        if (process.env.NODE_ENV === "development") {
          console.debug("[PedidosPage] Error de autenticación ignorado:", err);
        }
      }
    };

    loadUserEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Función para cargar órdenes automáticamente cuando el usuario está autenticado
  const handleAutoLoad = async (userEmail: string) => {
    setLoading(true);
    setError(null);
    setOrders(null);
    setOrderDetail(null);

    try {
      const [ordersResponse, loyaltyResponse] = await Promise.all([
        fetch("/api/account/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: userEmail,
          }),
        }),
        fetch(`/api/account/loyalty?email=${encodeURIComponent(userEmail)}`),
      ]);

      const ordersData = await ordersResponse.json();
      const loyaltyData = await loyaltyResponse.json();

      if (ordersResponse.ok) {
        // La API siempre devuelve { orders: [...] } cuando es ok
        if (ordersData.orders && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders);
        } else {
          // Si no viene orders en la respuesta, establecer array vacío
          setOrders([]);
        }
        // Limpiar error si la respuesta fue exitosa
        setError(null);
      } else {
        // Si la respuesta no es ok, verificar el status
        setOrders([]);
        if (ordersResponse.status >= 500) {
          // Solo mostrar error para 500+
          const errorMessage = ordersData?.error || "Hubo un problema al cargar tus pedidos automáticamente. Intenta de nuevo.";
          setError(errorMessage);
        } else {
          // Para otros errores (400, 404, etc.), no mostrar error, solo lista vacía
          setError(null);
        }
      }

      if (loyaltyResponse.ok && loyaltyData) {
        setLoyaltyPoints({
          pointsBalance: loyaltyData.pointsBalance || 0,
          lifetimeEarned: loyaltyData.lifetimeEarned || 0,
          canApplyDiscount: loyaltyData.canApplyDiscount || false,
        });
        setLoyaltyError(null);
      }
    } catch (err) {
      console.error("[PedidosPage] Error al cargar órdenes automáticamente:", err);
    } finally {
      setLoading(false);
    }
  };

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
      // Construir payload sin orderId si está vacío
      const payload: { email: string; orderId?: string } = {
        email: searchEmail,
      };
      const trimmedOrderId = orderId.trim();
      if (trimmedOrderId.length > 0) {
        payload.orderId = trimmedOrderId;
      }

      // Hacer ambas llamadas en paralelo: órdenes y puntos de lealtad
      const [ordersResponse, loyaltyResponse] = await Promise.all([
        fetch("/api/account/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
        fetch(`/api/account/loyalty?email=${encodeURIComponent(searchEmail)}`),
      ]);

      const ordersData = await ordersResponse.json();
      const loyaltyData = await loyaltyResponse.json();

      if (!ordersResponse.ok) {
        // Manejar 404 específicamente para "orden no encontrada" (solo si se buscó por orderId)
        if (ordersResponse.status === 404 && trimmedOrderId.length > 0) {
          setError(ordersData.error || "Orden no encontrada o no pertenece a tu cuenta");
          setOrders([]);
          setOrderDetail(null);
        } else if (ordersResponse.status >= 500) {
          // Solo mostrar banner rojo para errores 500+
          setError(ordersData.error || "Error al obtener pedidos");
          setOrders([]);
          setOrderDetail(null);
        } else {
          // Para otros errores (400, 422, etc.), establecer lista vacía sin mostrar error
          setOrders([]);
          setOrderDetail(null);
          setError(null);
        }
        setLoading(false);
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
        
        // Scroll suave hacia los resultados si hay pedidos
        if (ordersData.orders.length > 0) {
          setTimeout(() => {
            ordersRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
        }
      } else {
        // Si no hay órdenes ni detalle, establecer array vacío para mostrar empty state
        setOrders([]);
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
    // Usar el email del usuario autenticado si el campo email está vacío
    const emailToUse = email.trim() || userEmail || "";
    if (!emailToUse) {
      setError("Email requerido para ver el detalle del pedido");
      return;
    }

    setLoadingDetail(true);
    setError(null);
    setSelectedOrderId(id);
    setOrderDetail(null); // Limpiar detalle anterior

    const requestBody = {
      email: emailToUse,
      orderId: id,
    };

    // Log temporal para debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[handleViewDetail] Request:", {
        ...requestBody,
        orderIdLength: id.length,
        orderIdType: typeof id,
        emailSource: email.trim() ? "input" : "userEmail",
      });
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Mis pedidos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consulta el historial de tus pedidos y los puntos generados.
        </p>
      </header>

      <AccountSectionHeader
        user={{ email: userEmail, fullName: userFullName }}
        currentSection="pedidos"
      />

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6 animate-[fadeInUp_0.5s_ease-out_forwards]">

        {/* Formulario de búsqueda */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                {isAuthenticated
                  ? "Tus pedidos se cargan automáticamente. Puedes buscar por otro email si lo necesitas."
                  : "Ingresa el correo con el que realizaste tu compra para ver el historial de pedidos."}
              </p>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email {isAuthenticated ? "(opcional)" : "*"}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required={!isAuthenticated}
                placeholder="tu@email.com"
                autoComplete="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {isAuthenticated && userEmail && (
                <p className="mt-1 text-sm text-gray-500">
                  Estás autenticado como: <strong>{userEmail}</strong>
                </p>
              )}
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
              disabled={loading || (!isAuthenticated && !email.trim())}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 hover:-translate-y-[1px] active:translate-y-0 font-semibold"
            >
              {loading ? "Buscando..." : isAuthenticated && userEmail ? "Buscar por otro email" : "Buscar pedidos"}
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
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium transition-all duration-150 hover:-translate-y-[1px] active:translate-y-0"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Panel de puntos de lealtad */}
        {email.trim() && isValidEmail(email) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
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
          <div ref={ordersRef} className="overflow-hidden">
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
                          {order.shortId}
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
                      {/* Resumen de envío usando campos de shipping */}
                      {(() => {
                        // Priorizar campos de shipping directos sobre metadata
                        if (order.shipping_provider === "pickup") {
                          return (
                            <p className="text-sm text-gray-600 mt-1">
                              Recoger en tienda · $0
                            </p>
                          );
                        }
                        
                        if (order.shipping_provider && order.shipping_service_name) {
                          const serviceName = order.shipping_service_name;
                          const priceCents = order.shipping_price_cents;
                          
                          if (priceCents !== null && priceCents !== undefined) {
                            return (
                              <p className="text-sm text-gray-600 mt-1">
                                {serviceName} · {formatMXNFromCents(priceCents)}
                              </p>
                            );
                          }
                          
                          return (
                            <p className="text-sm text-gray-600 mt-1">
                              {serviceName}
                            </p>
                          );
                        }
                        
                        // Fallback a metadata para compatibilidad con pedidos antiguos
                        if (order.metadata?.shipping_method) {
                          const method = formatShippingMethod(order.metadata.shipping_method);
                          const shippingCostCents = order.metadata.shipping_cost_cents;
                          
                          if (shippingCostCents !== undefined && shippingCostCents !== null) {
                            if (shippingCostCents > 0) {
                              return (
                                <p className="text-sm text-gray-600 mt-1">
                                  {method} · {formatMXNFromCents(shippingCostCents)}
                                </p>
                              );
                            } else {
                              return (
                                <p className="text-sm text-gray-600 mt-1">
                                  {method} · $0.00 (envío gratis)
                                </p>
                              );
                            }
                          }
                          
                          return (
                            <p className="text-sm text-gray-600 mt-1">
                              {method}
                            </p>
                          );
                        }
                        
                        return null;
                      })()}
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
                        aria-label={`Ver detalle del pedido ${order.shortId}`}
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

        {/* Empty state: no hay pedidos */}
        {email.trim() && isValidEmail(email) && !loading && orders !== null && orders.length === 0 && !orderDetail && !error && (
          <div ref={ordersRef} className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-700 font-medium mb-2">Todavía no tienes pedidos con este correo</p>
            <p className="text-sm text-gray-600">
              Cuando realices tu primera compra, aparecerá aquí.
            </p>
          </div>
        )}

        {orders && orders.length === 0 && orderDetail && (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Aún no tienes pedidos
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Cuando hagas tu primera compra, podrás ver aquí el historial y los puntos generados.
            </p>
            <a
              href="/tienda"
              className="inline-flex items-center rounded-xl bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition"
            >
              Ir a la tienda
            </a>
          </div>
        )}

        {/* Detalle de orden */}
        {orderDetail && (
          <div ref={detailRef} className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mt-6">
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

              {/* Bloque de información de envío */}
              {(orderDetail.shipping_provider || orderDetail.metadata?.shipping_method) && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h3 className="text-lg font-semibold mb-4">Información de envío</h3>
                  <div className="space-y-3">
                    {/* Método de envío */}
                    <div>
                      <p className="text-sm text-gray-600">Método de envío</p>
                      <p className="font-medium">
                        {orderDetail.shipping_provider === "pickup" ? (
                          "Recoger en tienda · Sin costo"
                        ) : orderDetail.shipping_provider && orderDetail.shipping_service_name ? (
                          `${orderDetail.shipping_service_name} (${orderDetail.shipping_provider})`
                        ) : orderDetail.metadata?.shipping_method ? (
                          formatShippingMethod(orderDetail.metadata.shipping_method)
                        ) : (
                          "No especificado"
                        )}
                      </p>
                    </div>

                    {/* Costo de envío */}
                    {orderDetail.shipping_price_cents !== null && orderDetail.shipping_price_cents !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Costo de envío</p>
                        <p className="font-medium">
                          {formatMXNFromCents(orderDetail.shipping_price_cents)}
                        </p>
                      </div>
                    )}

                    {/* Estimado de entrega */}
                    {(orderDetail.shipping_eta_min_days !== null || orderDetail.shipping_eta_max_days !== null) && (
                      <div>
                        <p className="text-sm text-gray-600">Tiempo estimado de entrega</p>
                        <p className="font-medium">
                          {orderDetail.shipping_eta_min_days !== null && orderDetail.shipping_eta_max_days !== null
                            ? `Llega entre ${orderDetail.shipping_eta_min_days} y ${orderDetail.shipping_eta_max_days} días`
                            : orderDetail.shipping_eta_min_days !== null
                              ? `Aproximadamente en ${orderDetail.shipping_eta_min_days} días`
                              : orderDetail.shipping_eta_max_days !== null
                                ? `Aproximadamente en ${orderDetail.shipping_eta_max_days} días`
                                : ""}
                        </p>
                      </div>
                    )}

                    {/* Tracking */}
                    {orderDetail.shipping_tracking_number ? (
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm text-gray-600">Número de guía</p>
                          <p className="font-medium font-mono text-sm">
                            {orderDetail.shipping_tracking_number}
                          </p>
                        </div>
                        {orderDetail.shipping_label_url && (
                          <div>
                            <a
                              href={orderDetail.shipping_label_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 underline"
                            >
                              Ver guía / etiqueta PDF
                              <svg
                                className="ml-1 w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </a>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-500 italic">
                          La guía de envío aún no se ha generado. Si ya realizaste el pago, se generará en cuanto preparemos tu pedido.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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

