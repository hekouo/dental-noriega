"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Props = {
  defaultFrom: string;
  defaultTo: string;
};

export default function EnviosReportClient({ defaultFrom, defaultTo }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams?.get("from") || defaultFrom);
  const [to, setTo] = useState(searchParams?.get("to") || defaultTo);

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/reportes/envios?${params.toString()}`);
  };

  const handleQuickFilter = (days: number | null) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (days === null) {
      // Todo el tiempo: desde hace 1 año
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      oneYearAgo.setHours(0, 0, 0, 0);
      setFrom(oneYearAgo.toISOString().split("T")[0]);
      setTo(today.toISOString().split("T")[0]);
    } else {
      const fromDate = new Date(today);
      fromDate.setDate(fromDate.getDate() - days);
      fromDate.setHours(0, 0, 0, 0);
      setFrom(fromDate.toISOString().split("T")[0]);
      setTo(today.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-1">
            Desde
          </label>
          <input
            type="date"
            id="from"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
            Hasta
          </label>
          <input
            type="date"
            id="to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div>
          <button
            onClick={handleApplyFilters}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium"
          >
            Aplicar filtros
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 mr-2">Filtros rápidos:</span>
        <button
          onClick={() => handleQuickFilter(7)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Últimos 7 días
        </button>
        <button
          onClick={() => handleQuickFilter(30)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Últimos 30 días
        </button>
        <button
          onClick={() => {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setFrom(firstDay.toISOString().split("T")[0]);
            setTo(today.toISOString().split("T")[0]);
          }}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Este mes
        </button>
        <button
          onClick={() => handleQuickFilter(null)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Todo el tiempo
        </button>
      </div>
    </div>
  );
}

