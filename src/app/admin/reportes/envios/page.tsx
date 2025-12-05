import { notFound } from "next/navigation";
import { checkAdminAccess } from "@/lib/admin/access";
import { getShippingReport } from "@/lib/admin/shippingReport.server";
import { formatMXNFromCents } from "@/lib/utils/currency";
import EnviosReportClient from "./EnviosReportClient";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

/**
 * Página de reporte de envíos en admin
 * 
 * Requiere que el usuario esté autenticado y su email esté en ADMIN_ALLOWED_EMAILS
 */
export default async function EnviosReportPage({ searchParams }: Props) {
  // Verificar acceso admin
  const access = await checkAdminAccess();
  if (access.status !== "allowed") {
    notFound();
  }

  const params = await searchParams;

  // Calcular fechas por defecto (últimos 30 días)
  const today = new Date();
  today.setHours(23, 59, 59, 999); // Fin del día

  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0); // Inicio del día

  const from = params.from ? new Date(params.from) : defaultFrom;
  const to = params.to ? new Date(params.to) : today;

  // Asegurar que las fechas sean válidas
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Reporte de Envíos
        </h1>
        <p className="text-red-600">Fechas inválidas</p>
      </div>
    );
  }

  // Obtener reporte
  const reportData = await getShippingReport({ from, to });

  // Calcular totales
  const totalOrders = reportData.reduce((sum, row) => sum + row.ordersCount, 0);
  const totalCents = reportData.reduce(
    (sum, row) => sum + row.totalShippingPriceCents,
    0,
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reporte de Envíos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Resumen de envíos por proveedor y servicio
        </p>
      </header>

      <EnviosReportClient defaultFrom={from.toISOString().split("T")[0]} defaultTo={to.toISOString().split("T")[0]} />

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow-sm rounded-lg">
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
            {reportData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No hay envíos en el rango de fechas seleccionado
                </td>
              </tr>
            ) : (
              <>
                {reportData.map((row, idx) => (
                  <tr key={`${row.provider}-${row.serviceName || "null"}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {row.provider}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {row.serviceName || "(sin especificar)"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {row.ordersCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatMXNFromCents(row.totalShippingPriceCents)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-semibold">
                  <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">
                    Total
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {totalOrders}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {formatMXNFromCents(totalCents)}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

