"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Props = {
  sections: Array<{ sectionSlug: string; title: string }>;
};

export default function CatalogFilters({ sections }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => ({
      section: searchParams?.get("section") || "",
      minPrice: searchParams?.get("minPrice") || "",
      maxPrice: searchParams?.get("maxPrice") || "",
      search: searchParams?.get("search") || "",
    }),
    [searchParams],
  );

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    router.replace(`?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border space-y-4">
      <h3 className="font-semibold text-lg">Filtros</h3>

      {/* Búsqueda */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium mb-1">
          Buscar
        </label>
        <input
          id="search"
          type="text"
          value={filters.search}
          onChange={(e) => updateFilter("search", e.target.value)}
          placeholder="Nombre del producto..."
          className="w-full border rounded-lg px-3 py-2"
        />
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="section" className="block text-sm font-medium mb-1">
          Categoría
        </label>
        <select
          id="section"
          value={filters.section}
          onChange={(e) => updateFilter("section", e.target.value)}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="">Todas las categorías</option>
          {sections.map((section) => (
            <option key={section.sectionSlug} value={section.sectionSlug}>
              {section.title}
            </option>
          ))}
        </select>
      </div>

      {/* Precio */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="minPrice" className="block text-sm font-medium mb-1">
            Precio mínimo
          </label>
          <input
            id="minPrice"
            type="number"
            value={filters.minPrice}
            onChange={(e) => updateFilter("minPrice", e.target.value)}
            placeholder="0"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="maxPrice" className="block text-sm font-medium mb-1">
            Precio máximo
          </label>
          <input
            id="maxPrice"
            type="number"
            value={filters.maxPrice}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
            placeholder="9999"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Limpiar filtros */}
      {(filters.section ||
        filters.minPrice ||
        filters.maxPrice ||
        filters.search) && (
        <button
          onClick={() => router.replace("")}
          className="w-full text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
