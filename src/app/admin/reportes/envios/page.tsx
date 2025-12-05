import { notFound, redirect } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import { getShippingReport } from "@/lib/admin/shippingReport.server";
import { formatMXNFromCents } from "@/lib/utils/currency";
import ClientRangeSelect from "./ClientRangeSelect";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    range?: string;
  }>;
};

/**
 * Página de reporte de envíos en el panel admin
 * Muestra estadísticas de envíos agrupadas por proveedor y servicio
 */
export default async function AdminShippingReportPage({ searchParams }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status === "unauthenticated") {
    redirect("/cuenta");
  }
  if (access.status === "forbidden") {
    notFound();
  }

  const params = await searchParams;

  // Calcular rango de fechas
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(23, 59, 59, 999); // Fin del día

  let from: Date;
  let to: Date = today;

  // Si hay parámetros de fecha explícitos, usarlos
  if (params.from && params.to) {
    from = new Date(params.from);
    to = new Date(params.to);
    to.setHours(23, 59, 59, 999);
  } else if (params.range) {
    // Rango rápido
    switch (params.range) {
      case "last7days": {
        from = new Date(today);
        from.setDate(from.getDate() - 7);
        break;
      }
      case "last30days": {
        from = new Date(today);
        from.setDate(from.getDate() - 30);
        break;
      }
      case "thismonth": {
        from = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      }
      case "all": {
        // Desde hace 1 año (límite razonable)
        from = new Date(today);
        from.setFullYear(from.getFullYear() - 1);
        break;
      }
      default: {
        // Default: últimos 30 días
        from = new Date(today);
        from.setDate(from.getDate() - 30);
      }
    }
  } else {
    // Default: últimos 30 días
    from = new Date(today);
    from.setDate(from.getDate() - 30);
  }

  from.setHours(0, 0, 0, 0); // Inicio del día

  // Obtener reporte
  const reportRows = await getShippingReport({ from, to });

  // Calcular totales
  const totalOrders = reportRows.reduce((sum, row) => sum + row.ordersCount, 0);
  const totalRevenue = reportRows.reduce(
    (sum, row) => sum + row.totalShippingPriceCents,
    0,
  );

  // Formatear fechas para inputs
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const fromInput = formatDateForInput(from);
  const toInput = formatDateForInput(to);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Reporte de Envíos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Estadísticas de envíos agrupadas por proveedor y servicio
            </p>
          </div>

          {/* Filtros */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <form
              method="get"
              action="/admin/reportes/envios"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label
                    htmlFor="from"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Desde
                  </label>
                  <input
                    type="date"
                    id="from"
                    name="from"
                    defaultValue={fromInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="to"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Hasta
                  </label>
                  <input
                    type="date"
                    id="to"
                    name="to"
                    defaultValue={toInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="range"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Rango rápido
                  </label>
                  <ClientRangeSelect defaultValue={params.range || ""} />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Aplicar filtros
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Tabla de resultados */}
          <div className="px-6 py-4">
            {reportRows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No se encontraron envíos en el rango de fechas seleccionado.
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Proveedor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Servicio
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          # Envíos
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cobrado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportRows.map((row, index) => (
                        <tr key={`${row.provider}-${row.serviceName || "null"}-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.provider}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.serviceName || "(sin especificar)"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {row.ordersCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                            {formatMXNFromCents(row.totalShippingPriceCents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td
                          colSpan={2}
                          className="px-6 py-4 text-sm font-semibold text-gray-900"
                        >
                          Total
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          {totalOrders}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          {formatMXNFromCents(totalRevenue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
