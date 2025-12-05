"use client";

import { useRouter } from "next/navigation";

type Props = {
  defaultValue: string;
};

export default function ClientRangeSelect({ defaultValue }: Props) {
  const router = useRouter();

  return (
    <select
      id="range"
      name="range"
      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
      defaultValue={defaultValue}
      onChange={(e) => {
        if (e.target.value) {
          router.push(`/admin/reportes/envios?range=${e.target.value}`);
        } else {
          router.push(`/admin/reportes/envios`);
        }
      }}
    >
      <option value="">Seleccionar...</option>
      <option value="last7days">Últimos 7 días</option>
      <option value="last30days">Últimos 30 días</option>
      <option value="thismonth">Este mes</option>
      <option value="all">Todo el tiempo</option>
    </select>
  );
}

