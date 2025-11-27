import { notFound } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import { getAllOrdersAdmin, type AdminOrderFilters } from "@/lib/supabase/orders.server";
import AdminPedidosClient from "./AdminPedidosClient";

type Props = {
  searchParams: Promise<{
    status?: string;
    email?: string;
    dateRange?: string;
    page?: string;
  }>;
};

/**
 * Página de administración de pedidos
 * 
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 * 
 * Filtros disponibles:
 * - status: Estado de la orden (all, paid, pending, failed, canceled, etc.)
 * - email: Búsqueda parcial por email
 * - dateRange: Rango rápido (today, last7days, last30days)
 * - page: Número de página (default: 1)
 */
export default async function AdminPedidosPage({ searchParams }: Props) {
  // Verificar acceso admin
  const { allowed } = await checkAdminAccess();
  if (!allowed) {
    notFound();
  }

  const params = await searchParams;
  const status = params.status || "all";
  const email = params.email || "";
  const dateRange = params.dateRange || "";
  const page = Math.max(1, parseInt(params.page || "1", 10));

  // Calcular rango de fechas según dateRange
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  if (dateRange) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case "today": {
        dateFrom = today.toISOString();
        dateTo = today.toISOString();
        break;
      }
      case "last7days": {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        dateFrom = last7.toISOString();
        dateTo = today.toISOString();
        break;
      }
      case "last30days": {
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        dateFrom = last30.toISOString();
        dateTo = today.toISOString();
        break;
      }
    }
  }

  // Construir filtros
  const filters: AdminOrderFilters = {
    status: status === "all" ? null : status,
    email: email || null,
    dateFrom,
    dateTo,
    limit: 20,
    offset: (page - 1) * 20,
  };

  // Obtener órdenes
  const { orders, total } = await getAllOrdersAdmin(filters);

  const totalPages = Math.ceil(total / 20);

  return (
    <AdminPedidosClient
      orders={orders}
      total={total}
      currentPage={page}
      totalPages={totalPages}
      filters={{
        status,
        email,
        dateRange,
      }}
    />
  );
}

