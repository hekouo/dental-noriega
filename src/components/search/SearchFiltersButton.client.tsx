"use client";

import React from "react";
import { Filter } from "lucide-react";

type Props = {
  onClick: () => void;
  hasActiveFilters: boolean;
};

/**
 * Botón sticky para abrir filtros en móvil
 */
export default function SearchFiltersButton({ onClick, hasActiveFilters }: Props) {
  return (
    <button
      onClick={onClick}
      className="md:hidden fixed top-16 left-4 right-4 z-30 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium text-gray-900 hover:bg-gray-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px]"
      aria-label="Abrir filtros"
    >
      <Filter className={`w-5 h-5 ${hasActiveFilters ? "text-primary-600" : "text-gray-600"}`} />
      <span>Filtrar</span>
      {hasActiveFilters && (
        <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-600 text-white text-xs font-semibold">
          !
        </span>
      )}
    </button>
  );
}

