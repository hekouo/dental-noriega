"use client";

import { useRouter } from "next/navigation";
import { type CatalogSortOption } from "@/lib/catalog/config";

type SortSelectProps = {
  currentSort: CatalogSortOption;
  basePath: string;
  preserveParams?: Record<string, string>;
};

/**
 * Componente client para seleccionar ordenamiento
 * Navega a la URL con el sort seleccionado, reseteando page a 1
 */
export default function SortSelect({
  currentSort,
  basePath,
  preserveParams = {},
}: SortSelectProps) {
  const router = useRouter();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSort = e.target.value as CatalogSortOption;
    const params = new URLSearchParams();

    // Preservar parámetros adicionales (ej: q para búsqueda)
    Object.entries(preserveParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    // Agregar sort
    if (newSort !== "relevance") {
      params.set("sort", newSort);
    }

    // Resetear page a 1 cuando cambia el orden
    params.set("page", "1");

    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-gray-700">
        Ordenar por:
      </label>
      <select
        id="sort-select"
        value={currentSort}
        onChange={handleSortChange}
        className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        aria-label="Seleccionar ordenamiento"
      >
        <option value="relevance">Relevancia</option>
        <option value="price_asc">Precio: menor a mayor</option>
        <option value="price_desc">Precio: mayor a menor</option>
        <option value="name_asc">Nombre: A-Z</option>
      </select>
    </div>
  );
}

