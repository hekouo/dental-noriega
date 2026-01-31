"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatMXNFromCents } from "@/lib/utils/currency";
import type { OrderSummary } from "@/lib/supabase/orders.server";
import { getShippingStatusLabel, getShippingStatusVariant } from "@/lib/orders/shippingStatus";
import { getPaymentMethodLabel, getPaymentStatusLabel, getPaymentStatusVariant } from "@/lib/orders/paymentStatus";
import { PAYMENT_STATUSES, PAYMENT_STATUS_LABELS } from "@/lib/orders/statuses";
import OrderCleanupPanel from "./OrderCleanupPanel";

type Props = {
  orders: OrderSummary[];
  total: number;
  currentPage: number;
  totalPages: number;
  filters: {
    status: string;
    email: string;
    dateRange: string;
  };
};

export default function AdminPedidosClient({
  orders,
  total,
  currentPage,
  totalPages,
  filters,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [emailFilter, setEmailFilter] = useState(filters.email);
  const [dateRangeFilter, setDateRangeFilter] = useState(filters.dateRange);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "bank_pending" | "bank_all">("all");

  const updateFilters = () => {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") {
      params.set("status", statusFilter);
    }
    if (emailFilter) {
      params.set("email", emailFilter);
    }
    if (dateRangeFilter) {
      params.set("dateRange", dateRangeFilter);
    }
    // Resetear a página 1 al cambiar filtros
    params.set("page", "1");
    router.push(`/admin/pedidos?${params.toString()}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pendiente",
      paid: "Pagado",
      processing: "En proceso",
      completed: "Completado",
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
    return methodMap[method || ""] || method || "N/A";
  };

  // Filtro client-side para pagos por transferencia
  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (paymentFilter === "all") return true;
        if (paymentFilter === "bank_all") {
          return order.payment_method === "bank_transfer";
        }
        if (paymentFilter === "bank_pending") {
          return (
            order.payment_method === "bank_transfer" &&
            order.payment_status === "pending"
          );
        }
        return true;
      }),
    [orders, paymentFilter],
  );

  // Helper para badge de método de pago
  const getPaymentMethodBadgeClasses = (method: string | null | undefined) => {
    if (method === "bank_transfer") {
      return "bg-amber-100 text-amber-800";
    }
    if (method === "card") {
      return "bg-blue-100 text-blue-800";
    }
    return "bg-gray-100 text-gray-700";
  };

  const getOrderStatusBadgeClasses = (status: string) => {
    if (status === "completed") {
      return "bg-green-100 text-green-700";
    }
    if (status === "paid" || status === "processing") {
      return "bg-blue-100 text-blue-700";
    }
    if (status === "pending") {
      return "bg-yellow-100 text-yellow-700";
    }
    if (status === "failed") {
      return "bg-red-100 text-red-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  const getPaymentStatusBadgeClasses = (paymentStatus: string | null) => {
    const variant = getPaymentStatusVariant(paymentStatus);
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
  };

  const renderShippingProvider = (order: OrderSummary) => {
    if (order.shipping_provider === null || order.shipping_provider === "pickup") {
      return <span className="text-gray-700">Recoger en tienda</span>;
    }
    if (order.shipping_provider === "skydropx") {
      return (
        <div>
          <div className="font-medium text-gray-900">
            {order.shipping_service_name || "Skydropx"}
          </div>
          {order.shipping_price_cents !== null && (
            <div className="text-xs text-gray-500">
              {formatMXNFromCents(order.shipping_price_cents)}
            </div>
          )}
          {order.shipping_tracking_number && (
            <div className="text-xs text-gray-400 font-mono mt-1">
              {order.shipping_tracking_number}
            </div>
          )}
        </div>
      );
    }
    if (order.metadata?.shipping_method) {
      return formatShippingMethod(order.metadata.shipping_method);
    }
    return <span className="text-gray-400">N/A</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Administración de Pedidos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Panel de administración - Solo lectura
            </p>
          </div>
          <Link
            href="/admin/reportes/envios"
            className="px-4 py-2 text-sm text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Reporte de Envíos
          </Link>
        </div>
      </header>

      <OrderCleanupPanel />

      {/* Filtros rápidos de transferencia */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPaymentFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              paymentFilter === "all"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setPaymentFilter("bank_pending")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              paymentFilter === "bank_pending"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Solo transferencias pendientes
          </button>
          <button
            type="button"
            onClick={() => setPaymentFilter("bank_all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              paymentFilter === "bank_all"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Solo transferencias (todos los estados)
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Estado */}
          <div>
            <label
              htmlFor="status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Estado
            </label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Todos</option>
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email (búsqueda parcial)
            </label>
            <input
              id="email"
              type="text"
              value={emailFilter}
              onChange={(e) => setEmailFilter(e.target.value)}
              placeholder="ejemplo@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Rango de fechas */}
          <div>
            <label
              htmlFor="dateRange"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Rango de fechas
            </label>
            <select
              id="dateRange"
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Todos los tiempos</option>
              <option value="today">Hoy</option>
              <option value="last7days">Últimos 7 días</option>
              <option value="last30days">Últimos 30 días</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={updateFilters}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Aplicar filtros
          </button>
          {(statusFilter !== "all" || emailFilter || dateRangeFilter) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setEmailFilter("");
                setDateRangeFilter("");
                router.push("/admin/pedidos");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="mb-4 text-sm text-gray-600">
        Mostrando {filteredOrders.length} de {total} pedidos
        {paymentFilter !== "all" && ` (filtrado por transferencias)`}
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Método de pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Estado de pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Envío
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Estado envío
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                    No se encontraron pedidos con los filtros aplicados
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-xs text-gray-500">
                        {order.shortId}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {order.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getOrderStatusBadgeClasses(
                          order.status,
                        )}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentMethodBadgeClasses(
                          order.payment_method,
                        )}`}
                      >
                        {getPaymentMethodLabel(order.payment_method)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadgeClasses(
                          order.payment_status,
                        )}`}
                      >
                        {getPaymentStatusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {renderShippingProvider(order)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {order.shipping_provider || order.shipping_status ? (
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
                      ) : (
                        <span className="text-xs text-gray-400">No enviado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-right">
                      {order.total_cents !== null
                        ? formatMXNFromCents(order.total_cents)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Link
                        href={`/admin/pedidos/${order.id}`}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Página {currentPage} de {totalPages}
          </div>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link
                href={`/admin/pedidos?${new URLSearchParams({
                  ...(searchParams ? Object.fromEntries(searchParams.entries()) : {}),
                  page: String(currentPage - 1),
                }).toString()}`}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Anterior
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`/admin/pedidos?${new URLSearchParams({
                  ...(searchParams ? Object.fromEntries(searchParams.entries()) : {}),
                  page: String(currentPage + 1),
                }).toString()}`}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

